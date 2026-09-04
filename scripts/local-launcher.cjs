const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const workspace = path.resolve(__dirname, '..');

function parseOptions(args, mode = 'admin') {
  const known = new Set(['--check', '--no-open', '--help', ...(mode === 'admin' ? ['--with-preview'] : [])]);
  for (const arg of args) if (!known.has(arg)) throw new Error(`Unknown option: ${arg}. Use --help.`);
  return { check: args.includes('--check'), open: !args.includes('--no-open'), preview: args.includes('--with-preview'), help: args.includes('--help') };
}

function sameWorkspace(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const normalize = value => path.resolve(value).replace(/\\/g, '/').toLowerCase();
  return normalize(a) === normalize(b);
}

function sameApi(a, b) {
  return String(a).replace('://localhost:', '://127.0.0.1:').replace(/\/$/, '') === String(b).replace('://localhost:', '://127.0.0.1:').replace(/\/$/, '');
}

function portOpen(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = open => { socket.destroy(); resolve(open); };
    socket.setTimeout(700, () => finish(true));
    socket.once('connect', () => finish(true));
    socket.once('error', error => finish(error.code !== 'ECONNREFUSED'));
  });
}

async function probeService(service) {
  if (!await portOpen(service.port)) return 'free';
  try {
    const response = await fetch(`http://127.0.0.1:${service.port}${service.healthPath}`, { signal: AbortSignal.timeout(1000), redirect: 'error' });
    const data = await response.json();
    return response.ok && data.protocol === 1 && data.service === service.name && data.localAdmin === true &&
      sameWorkspace(data.workspace, service.workspace) && (service.apiBase === undefined || sameApi(data.apiBase, service.apiBase)) ? 'ready' : 'conflict';
  } catch { return 'conflict'; }
}

async function waitForReady(service, child, timeoutMs = 30000, signal) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Startup cancelled.');
    if (child && (child.exitCode !== null || child.signalCode !== null || child.spawnFailure)) throw new Error(`${service.name} exited before becoming ready. Log: ${service.logPath}`);
    if (await probeService(service) === 'ready') return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`${service.name} did not become ready within ${timeoutMs / 1000}s. Log: ${service.logPath || '(existing service)'}; check port ${service.port}.`);
}

async function stopChild(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    // Only kill a still-owned child tree; never kill processes by port or image name.
    try { await execFileAsync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }); }
    catch (error) { if (child.exitCode === null && child.signalCode === null) throw error; }
  } else {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
}

async function startServices(services, { logDir, timeoutMs = 30000, signal, log = console.log } = {}) {
  const children = [];
  const stop = async () => { await Promise.all(children.map(stopChild)); };
  try {
    const states = await Promise.all(services.map(probeService));
    const conflict = services.find((_, index) => states[index] === 'conflict');
    if (conflict) throw new Error(`Port ${conflict.port} is occupied by an unrecognized or incompatible service. Close its original window, then retry. No existing process was stopped.`);
    fs.mkdirSync(logDir, { recursive: true });
    const pending = services.map((service, index) => {
      if (states[index] === 'ready') { log(`[reuse] ${service.name} :${service.port}`); return Promise.resolve(); }
      if (signal?.aborted) throw new Error('Startup cancelled.');
      service.logPath = path.join(logDir, `${Date.now()}-${service.name}.log`);
      const fd = fs.openSync(service.logPath, 'a');
      let child;
      try {
        child = spawn(process.execPath, service.args, { cwd: service.cwd, env: service.env, windowsHide: true, stdio: ['ignore', fd, fd] });
      } finally { fs.closeSync(fd); }
      child.once('error', error => { child.spawnFailure = error; });
      children.push(child);
      log(`[start] ${service.name} :${service.port} -> ${service.logPath}`);
      return waitForReady(service, child, timeoutMs, signal);
    });
    await Promise.all(pending);
    return { children, stop };
  } catch (error) { await stop(); throw error; }
}

function acquireLock(root) {
  const dir = path.join(root, '.local-admin');
  fs.mkdirSync(dir, { recursive: true });
  // Older launchers hold launcher.lock for their lifetime; leave that lock intact.
  const file = path.join(dir, 'startup.lock');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(file, 'wx');
      try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid })); } finally { fs.closeSync(fd); }
      return () => { if (JSON.parse(fs.readFileSync(file, 'utf8')).pid === process.pid) fs.unlinkSync(file); };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let owner;
      try { owner = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error(`Launcher lock is incomplete. Retry shortly, or inspect ${file}.`); }
      if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new Error(`Invalid launcher lock: ${file}`);
      try { process.kill(owner.pid, 0); return null; }
      catch (failure) { if (failure.code !== 'ESRCH') throw failure; }
      fs.unlinkSync(file);
    }
  }
  throw new Error('Another launcher is starting. Retry shortly.');
}

function missingDependencies(root) {
  const modules = ['tsx/cli', 'vite/package.json', 'dotenv', 'express', 'react', 'react-dom', 'react-router-dom', '@vitejs/plugin-react', 'zod', 'pg', 'bcryptjs', 'cookie-parser', 'cors', 'helmet', 'jsonwebtoken'];
  return modules.filter(name => { try { require.resolve(name, { paths: [root] }); return false; } catch { return true; } });
}

async function waitForLock(root, signal, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Startup cancelled.');
    const release = acquireLock(root);
    if (release) return release;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Another launcher is still starting. Retry when it is ready.');
}

function ensureEnvFiles(root, preview, mode = 'admin') {
  for (const folder of ['backend', `${mode}-site`, ...(preview && mode === 'admin' ? ['public-site'] : [])]) {
    const target = path.join(root, folder, '.env');
    if (fs.existsSync(target)) continue;
    fs.copyFileSync(path.join(root, folder, '.env.example'), target, fs.constants.COPYFILE_EXCL);
    console.log(`[config] Created ${folder}/.env from template; existing configurations are never overwritten.`);
  }
}

function createServices(root, preview, mode = 'admin') {
  const dotenv = require(require.resolve('dotenv', { paths: [root] }));
  const backendEnvFile = path.join(root, 'backend', '.env');
  const fileEnv = fs.existsSync(backendEnvFile) ? dotenv.parse(fs.readFileSync(backendEnvFile)) : {};
  const port = Number(process.env.PORT || fileEnv.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || [5173, 5174].includes(port)) throw new Error('Invalid backend PORT; choose 1-65535, excluding 5173 and 5174.');
  const apiBase = `http://127.0.0.1:${port}`;
  const vite = path.join(path.dirname(require.resolve('vite/package.json', { paths: [root] })), 'bin', 'vite.js');
  const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), VITE_API_BASE_URL: apiBase, VITE_BASE_PATH: '/', VITE_PUBLIC_SITE_URL: 'http://127.0.0.1:5173' };
  env.LOCAL_ADMIN_ORIGINS = [...new Set([...(process.env.LOCAL_ADMIN_ORIGINS || fileEnv.LOCAL_ADMIN_ORIGINS || '').split(','), 'http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:4174', 'http://localhost:4174'].filter(Boolean))].join(',');
  const services = [
    { name: 'backend', port, healthPath: '/api/health', args: [require.resolve('tsx/cli', { paths: [root] }), 'watch', 'src/index.ts'] }
  ];
  if (mode === 'admin') services.push({ name: 'admin-site', port: 5174, healthPath: '/__local-launcher', apiBase, args: [vite, '--host', '127.0.0.1', '--port', '5174', '--strictPort'] });
  if (mode === 'public' || preview) services.push({ name: 'public-site', port: 5173, healthPath: '/__local-launcher', apiBase, args: [vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort'] });
  return services.map(service => ({ ...service, workspace: root, cwd: path.join(root, service.name), env: { ...env, VITE_SITE_RUNTIME: service.name === 'admin-site' ? 'admin' : 'public' } }));
}

function openBrowser(url) {
  return execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process '${url}'`], { windowsHide: true });
}

async function main(args = process.argv.slice(2), mode = 'admin') {
  if (!['admin', 'public'].includes(mode)) throw new Error('Invalid launcher mode.');
  const options = parseOptions(args, mode);
  if (options.help) {
    console.log(`start-${mode}-site.bat ${mode === 'admin' ? '[--with-preview] ' : ''}[--no-open] [--check]\nDefault: API + ${mode}, one console. Ctrl+C stops only services started here.\n${mode === 'admin' ? '--with-preview: also start the public-site used by mobile preview\n' : ''}--no-open: start without opening a browser\n--check: read-only dependency/config/service checks; no install, launch or browser`);
    return;
  }
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20 or later is required.');
  const missing = missingDependencies(workspace);
  if (options.check) {
    if (missing.length) throw new Error(`Missing dependencies: ${missing.join(', ')}. Run npm ci.`);
    let conflict = false;
    for (const service of createServices(workspace, options.preview, mode)) {
      const state = await probeService(service);
      console.log(`[check] ${service.name} :${service.port} ${state}`);
      conflict ||= state === 'conflict';
    }
    if (conflict) throw new Error('A port is occupied by an incompatible service. Close its original window before starting this launcher.');
    return;
  }
  let releaseLock;
  let session;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    releaseLock = acquireLock(workspace);
    if (!releaseLock) {
      console.log('[wait] Another launcher is starting. Waiting for the shared startup lock...');
      releaseLock = await waitForLock(workspace, controller.signal);
    }
    if (missingDependencies(workspace).length) {
      // Never replace node_modules while a site may still be using it.
      if ((await Promise.all([4000, 5173, 5174].map(portOpen))).some(Boolean)) throw new Error('Dependencies are incomplete. Stop existing project services before running npm ci.');
      console.log('[install] Installing locked dependencies with npm ci...');
      await new Promise((resolve, reject) => {
        const child = spawn('cmd.exe', ['/d', '/s', '/c', 'npm.cmd ci --no-audit --no-fund'], { cwd: workspace, windowsHide: true, stdio: 'inherit', signal: controller.signal });
        child.once('error', reject);
        child.once('exit', code => code === 0 ? resolve() : reject(new Error(`npm ci failed (${code}). Check Node/npm and network access.`)));
      });
    }
    ensureEnvFiles(workspace, options.preview, mode);
    const services = createServices(workspace, options.preview, mode);
    session = await startServices(services, { logDir: path.join(workspace, '.local-admin', 'logs'), signal: controller.signal });
    // Serialize startup, not the entire lifetime: another launcher may add a site.
    releaseLock();
    releaseLock = undefined;
    const url = mode === 'public' ? 'http://127.0.0.1:5173/' : 'http://127.0.0.1:5174/dashboard';
    console.log(`[ready] ${url}\nAPI: http://127.0.0.1:${services[0].port}${mode === 'admin' ? '\nNo account or password required.' : ''}`);
    console.log('Shared services stay owned by their original window. Keep that window open while either site uses them.');
    if (options.open) await openBrowser(url).catch(() => console.warn(`[browser] Could not open the browser. Open ${url} manually.`));
    if (session?.children.length) {
      console.log('Keep this window open. Press Ctrl+C to stop services started in this window. Logs: .local-admin/logs');
      await new Promise((resolve, reject) => {
        if (controller.signal.aborted) { resolve(); return; }
        controller.signal.addEventListener('abort', resolve, { once: true });
        for (const child of session.children) {
          if (child.exitCode !== null || child.signalCode !== null) { reject(new Error('A service stopped. Inspect .local-admin/logs.')); return; }
          child.once('exit', code => controller.signal.aborted ? resolve() : reject(new Error(`A service stopped (${code}). Inspect .local-admin/logs.`)));
        }
      });
    }
  } finally {
    try { await session?.stop(); }
    finally {
      releaseLock?.();
      process.removeListener('SIGINT', cancel);
      process.removeListener('SIGTERM', cancel);
    }
  }
}

module.exports = { parseOptions, sameWorkspace, sameApi, probeService, waitForReady, startServices, acquireLock, waitForLock, missingDependencies, ensureEnvFiles, createServices, main };
if (require.main === module) main().catch(error => { console.error(`[ERROR] ${error.message}`); process.exitCode = 1; });
