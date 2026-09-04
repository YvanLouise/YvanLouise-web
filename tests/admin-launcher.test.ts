import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { once } from "node:events";
import launcher from "../scripts/admin-launcher.cjs";

const fixture = path.resolve("tests/fixtures/launcher-server.cjs");
async function freePort(): Promise<number> {
  const server = http.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}
function temp(t: { after: (fn: () => void) => void }): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "admin-launcher-test-"));
  // Only remove the exact directory created by this test.
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function service(root: string, port: number, mode = "ready", name = "backend") {
  return { workspace: root, cwd: root, port, name, healthPath: "/api/health", args: [fixture, String(port), name, root, mode] };
}

test("launcher options are explicit and workspace paths support spaces", () => {
  assert.deepEqual(launcher.parseOptions([]), { check: false, open: true, preview: false, help: false });
  assert.equal(launcher.parseOptions(["--check", "--no-open", "--with-preview"]).preview, true);
  assert.throws(() => launcher.parseOptions(["--kill-all"]), /Unknown option/);
  assert.equal(launcher.sameWorkspace(path.resolve("folder with spaces"), path.resolve("folder with spaces") + path.sep), true);
  assert.equal(launcher.sameWorkspace(undefined, "x"), false);
  assert.equal(launcher.sameApi("http://localhost:4000/", "http://127.0.0.1:4000"), true);
  assert.equal(launcher.sameApi("http://localhost:4001", "http://127.0.0.1:4000"), false);
});

test("launcher lock prevents duplicate startup and is released", t => {
  const root = temp(t);
  fs.mkdirSync(path.join(root, ".local-admin"));
  const legacyLock = path.join(root, ".local-admin", "launcher.lock");
  fs.writeFileSync(legacyLock, JSON.stringify({ pid: process.pid }));
  const release = launcher.acquireLock(root);
  assert.equal(typeof release, "function");
  assert.equal(launcher.acquireLock(root), null);
  release();
  const nextRelease = launcher.acquireLock(root);
  assert.equal(typeof nextRelease, "function");
  nextRelease();
  assert.equal(JSON.parse(fs.readFileSync(legacyLock, "utf8")).pid, process.pid);
});

test("public launcher selects only API and public site with local settings", () => {
  assert.deepEqual(launcher.parseOptions(["--no-open", "--check"], "public"), { check: true, open: false, preview: false, help: false });
  assert.throws(() => launcher.parseOptions(["--with-preview"], "public"), /Unknown option/);
  const root = path.resolve(".");
  const services = launcher.createServices(root, false, "public");
  assert.deepEqual(services.map(s => s.name), ["backend", "public-site"]);
  assert.equal(services[1].port, 5173);
  assert.equal(services[1].env.VITE_SITE_RUNTIME, "public");
  assert.equal(services[1].env.VITE_API_BASE_URL, `http://127.0.0.1:${services[0].port}`);
  assert.deepEqual(services[1].args.slice(1), ["--host", "127.0.0.1", "--port", "5173", "--strictPort"]);
  assert.deepEqual(launcher.createServices(root, true).map(s => s.name), ["backend", "admin-site", "public-site"]);
});

test("public launcher creates only required env files and preserves existing values", t => {
  const root = temp(t);
  for (const folder of ["backend", "public-site"]) {
    fs.mkdirSync(path.join(root, folder));
    fs.writeFileSync(path.join(root, folder, ".env.example"), "PORT=4000\n");
  }
  fs.writeFileSync(path.join(root, "backend", ".env"), "PORT=4567\n");
  launcher.ensureEnvFiles(root, false, "public");
  assert.equal(fs.readFileSync(path.join(root, "backend", ".env"), "utf8"), "PORT=4567\n");
  assert.equal(fs.readFileSync(path.join(root, "public-site", ".env"), "utf8"), "PORT=4000\n");
  assert.equal(fs.existsSync(path.join(root, "admin-site")), false);
});

test("startup lock waits for another launcher and supports cancellation", async t => {
  const root = temp(t);
  const release = launcher.acquireLock(root);
  const waiting = launcher.waitForLock(root, undefined, 2000);
  release();
  const nextRelease = await waiting;
  try {
    await assert.rejects(launcher.waitForLock(root, AbortSignal.abort()), /cancelled/);
    await assert.rejects(launcher.waitForLock(root, undefined, 100), /still starting/);
  } finally { nextRelease(); }
});

test("public launcher adds its site alongside admin and stops only its own site", async t => {
  const root = temp(t);
  const backend = service(root, await freePort());
  const admin = service(root, await freePort(), "ready", "admin-site");
  const options = { logDir: path.join(root, "logs"), timeoutMs: 8000, log() {} };
  const first = await launcher.startServices([backend, admin], options);
  try {
    const publicSite = service(root, await freePort(), "ready", "public-site");
    const second = await launcher.startServices([backend, publicSite], options);
    try {
      assert.equal(second.children.length, 1);
      assert.equal(await launcher.probeService(publicSite), "ready");
      const repeated = await launcher.startServices([backend, publicSite], options);
      assert.equal(repeated.children.length, 0);
      await repeated.stop();
    } finally { await second.stop(); }
    assert.equal(await launcher.probeService(publicSite), "free");
    assert.equal(await launcher.probeService(backend), "ready");
    assert.equal(await launcher.probeService(admin), "ready");
  } finally { await first.stop(); }
});

test("launcher waits for readiness, reuses services and does not stop reused processes", async t => {
  const root = temp(t);
  const target = service(root, await freePort(), "slow");
  const options = { logDir: path.join(root, "logs"), timeoutMs: 8000, log() {} };
  const first = await launcher.startServices([target], options);
  try {
    assert.equal(first.children.length, 1);
    assert.equal(await launcher.probeService(target), "ready");
    const second = await launcher.startServices([target], options);
    assert.equal(second.children.length, 0);
    await second.stop();
    assert.equal(await launcher.probeService(target), "ready");
    assert.equal(fs.existsSync(target.logPath), true);
  } finally { await first.stop(); }
  assert.equal(await launcher.probeService(target), "free");
});

test("launcher rejects unrelated port occupants without terminating them", async t => {
  const root = temp(t);
  const server = http.createServer((_req, res) => { res.setHeader("Content-Type", "application/json"); res.end('{"ok":true}'); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const port = (server.address() as { port: number }).port;
    await assert.rejects(launcher.startServices([service(root, port)], { logDir: path.join(root, "logs") }), /occupied/);
    assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("launcher rolls back its own processes on startup failure or timeout", async t => {
  const root = temp(t);
  const first = service(root, await freePort());
  const failed = service(root, await freePort(), "exit", "admin-site");
  await assert.rejects(launcher.startServices([first, failed], { logDir: path.join(root, "logs"), timeoutMs: 5000, log() {} }), /exited/);
  assert.equal(await launcher.probeService(first), "free");
  const hung = service(root, await freePort(), "hang");
  await assert.rejects(launcher.startServices([hung], { logDir: path.join(root, "logs"), timeoutMs: 1300, log() {} }), /did not become ready/);
  assert.equal(await launcher.probeService(hung), "free");
});
