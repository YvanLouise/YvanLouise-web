const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const MAX_GITHUB_FILE_BYTES = 95 * 1024 * 1024;
const WARN_FILE_BYTES = 25 * 1024 * 1024;

function parseOptions(argv) {
  const options = { check: false, yes: false, skipTests: false, help: false, message: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") options.check = true;
    else if (value === "--yes") options.yes = true;
    else if (value === "--skip-tests") options.skipTests = true;
    else if (value === "--help" || value === "-h") options.help = true;
    else if (value === "--message" || value === "-m") {
      if (!argv[index + 1]) throw new Error(`${value} requires a commit message.`);
      options.message = argv[index + 1];
      index += 1;
    } else throw new Error(`Unknown option: ${value}`);
  }
  if (options.check && (options.yes || options.skipTests || options.message)) throw new Error("--check cannot be combined with upload options.");
  return options;
}

function defaultCommitMessage(date = new Date()) {
  const dateParts = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")];
  const timeParts = [date.getHours(), date.getMinutes(), date.getSeconds()].map(value => String(value).padStart(2, "0"));
  return `Update website ${dateParts.join("-")} ${timeParts.join(":")}`;
}

function validateCommitMessage(value) {
  const message = value.trim();
  if (!message) return "";
  if (/[\r\n\0]/.test(message)) throw new Error("Commit message must be a single line.");
  if (message.length > 120) throw new Error("Commit message must be 120 characters or fewer.");
  return message;
}

function riskyPathReason(filePath) {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  const name = path.posix.basename(normalized);
  if ((name === ".env" || name.startsWith(".env.")) && !name.endsWith(".example")) return "local environment file";
  if (["id_rsa", "id_ed25519"].includes(name) || /\.(pem|key|p12|pfx)$/.test(name)) return "credential or private-key file";
  return null;
}

function parseNulList(output) {
  return output.split("\0").filter(Boolean);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function git(root, args) {
  const result = await execFileAsync("git", args, { cwd: root, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

async function gitOutput(root, args) {
  return (await git(root, args)).stdout;
}

async function optionalGitOutput(root, args) {
  try { return await gitOutput(root, args); } catch { return ""; }
}

async function gitSucceeds(root, args) {
  try { await git(root, args); return true; } catch { return false; }
}

async function commandExists(command) {
  try {
    await execFileAsync(process.platform === "win32" ? "where.exe" : "which", [command], { windowsHide: true });
    return true;
  } catch { return false; }
}

async function runInherited(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(signal ? `Command stopped by ${signal}.` : `Command exited with code ${code}.`)));
  });
}

async function runNpmScript(root, scriptName) {
  if (!/^[a-z0-9:_-]+$/i.test(scriptName)) throw new Error("Invalid npm script name.");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  if (!await commandExists(npmCommand)) throw new Error("npm is not available in PATH.");
  if (process.platform === "win32") {
    const commandShell = process.env.ComSpec || process.env.COMSPEC || "cmd.exe";
    await runInherited(commandShell, ["/d", "/s", "/c", `${npmCommand} run ${scriptName}`], root);
    return;
  }
  await runInherited(npmCommand, ["run", scriptName], root);
}

function printHelp() {
  console.log(`YvanLouise GitHub uploader\n\nUsage:\n  update-github.bat [options]\n\nOptions:\n  --check              Show local status only; do not fetch, test, commit, or push\n  --yes                Skip the confirmation prompt\n  --skip-tests         Skip npm run ci (not recommended)\n  -m, --message TEXT   Use a one-line commit message (max 120 characters)\n  -h, --help           Show this help\n\nNormal uploads stage all repository changes after safety checks.`);
}

async function acquireLock(root) {
  const gitDir = path.resolve(await gitOutput(root, ["rev-parse", "--absolute-git-dir"]));
  const lockPath = path.join(gitDir, "github-uploader.lock");
  const create = () => {
    const handle = fs.openSync(lockPath, "wx");
    fs.writeFileSync(handle, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    fs.closeSync(handle);
  };
  try { create(); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    let pid = 0;
    try { pid = Number(JSON.parse(fs.readFileSync(lockPath, "utf8")).pid); } catch { /* stale lock */ }
    let active = false;
    if (pid > 0) try { process.kill(pid, 0); active = true; } catch { /* stale lock */ }
    if (active) throw new Error(`Another GitHub upload is already running (PID ${pid}).`);
    fs.rmSync(lockPath, { force: true });
    create();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try { fs.rmSync(lockPath, { force: true }); } catch { /* best-effort cleanup */ }
  };
}

async function assertNoGitOperation(root) {
  for (const [name, label] of [["MERGE_HEAD", "merge"], ["REBASE_HEAD", "rebase"], ["rebase-merge", "rebase"], ["rebase-apply", "rebase"], ["CHERRY_PICK_HEAD", "cherry-pick"], ["BISECT_LOG", "bisect"]]) {
    const location = await gitOutput(root, ["rev-parse", "--git-path", name]);
    if (fs.existsSync(path.resolve(root, location))) throw new Error(`A ${label} operation is still in progress. Finish or abort it before uploading.`);
  }
}

async function inspectFiles(root) {
  const tracked = await gitOutput(root, ["diff", "--name-only", "-z", "HEAD"]);
  const untracked = await gitOutput(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  const candidates = [...new Set([...parseNulList(tracked), ...parseNulList(untracked)])];
  const issues = [];
  const warnings = [];
  for (const filePath of candidates) {
    const reason = riskyPathReason(filePath);
    if (reason) issues.push(`${filePath} (${reason})`);
    const absolute = path.resolve(root, filePath);
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(absolute)) continue;
    const file = fs.lstatSync(absolute);
    if (!file.isFile()) continue;
    const bytes = file.size;
    if (bytes > MAX_GITHUB_FILE_BYTES) issues.push(`${filePath} (${formatBytes(bytes)} exceeds the upload safety limit)`);
    else if (bytes > WARN_FILE_BYTES) warnings.push(`${filePath} (${formatBytes(bytes)})`);
  }
  return { issues, warnings };
}

async function remoteState(root, remote, branch, fetch) {
  const remoteRef = `refs/remotes/${remote}/${branch}`;
  let exists = true;
  if (fetch) {
    try { await git(root, ["fetch", "--no-tags", remote, `+refs/heads/${branch}:${remoteRef}`]); }
    catch (error) {
      const detail = `${error.stderr ?? ""} ${error.message}`;
      if (/couldn't find remote ref|could not find remote ref/i.test(detail)) exists = false;
      else throw new Error(`Could not refresh ${remote}/${branch}. Check the network and GitHub credentials.\n${detail.trim()}`);
    }
  } else if (!await gitSucceeds(root, ["show-ref", "--verify", "--quiet", remoteRef])) exists = false;
  if (!exists) return { exists: false, ahead: 0, behind: 0 };
  const counts = (await gitOutput(root, ["rev-list", "--left-right", "--count", `HEAD...${remoteRef}`])).split(/\s+/).map(Number);
  return { exists: true, ahead: counts[0] || 0, behind: counts[1] || 0 };
}

async function confirmUpload(options, summary) {
  if (options.yes) return true;
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Interactive confirmation is unavailable. Re-run with --yes after reviewing --check.");
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await prompt.question(`${summary}\nContinue? [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally { prompt.close(); }
}

async function main(argv = process.argv.slice(2), root = path.resolve(__dirname, "..")) {
  const options = parseOptions(argv);
  if (options.help) { printHelp(); return 0; }
  if (!await commandExists("git")) throw new Error("Git is not installed or not available in PATH.");
  if ((await gitOutput(root, ["rev-parse", "--is-inside-work-tree"])) !== "true") throw new Error("This folder is not a Git repository.");
  const releaseLock = await acquireLock(root);
  const cleanup = () => releaseLock();
  process.once("exit", cleanup);
  try {
    await assertNoGitOperation(root);
    const branch = await gitOutput(root, ["branch", "--show-current"]);
    if (!branch) throw new Error("Detached HEAD cannot be uploaded. Switch to a branch first.");
    const remote = await optionalGitOutput(root, ["config", "--get", `branch.${branch}.remote`]) || "origin";
    let remoteUrl;
    try { remoteUrl = await gitOutput(root, ["remote", "get-url", remote]); }
    catch { throw new Error(`Git remote '${remote}' was not found.`); }
    const status = await gitOutput(root, ["status", "--short", "--branch"]);
    const hasChanges = Boolean(await gitOutput(root, ["status", "--porcelain"]));
    const fileCheck = await inspectFiles(root);
    const state = await remoteState(root, remote, branch, !options.check);

    console.log(`Repository: ${root}\nRemote:     ${remote} (${remoteUrl})\nBranch:     ${branch}\n\n${status || "Working tree is clean."}`);
    console.log(`\nLocal commits: ${state.ahead} ahead, ${state.behind} behind${state.exists ? "" : " (remote branch does not exist yet)"}.`);
    for (const warning of fileCheck.warnings) console.warn(`[WARN] Large file: ${warning}`);
    if (fileCheck.issues.length) throw new Error(`Blocked potentially unsafe files:\n- ${fileCheck.issues.join("\n- ")}\nMove credentials to an ignored local file and use Git LFS or compressed assets for very large files.`);
    if (options.check) return 0;
    if (state.behind > 0) throw new Error(`${remote}/${branch} has ${state.behind} commit(s) not present locally. Pull and resolve them before uploading.`);
    if (!hasChanges && state.ahead === 0 && state.exists) { console.log("\nNothing to upload; local and remote branches are in sync."); return 0; }

    const uploadSummary = hasChanges
      ? "All listed repository changes will be checked, committed, and pushed."
      : state.exists ? `${state.ahead} existing local commit(s) will be pushed.` : `The remote branch ${remote}/${branch} will be created.`;
    if (!await confirmUpload(options, uploadSummary)) {
      console.log("Cancelled; no files were staged or pushed.");
      return 0;
    }

    if (hasChanges) {
      const name = await optionalGitOutput(root, ["config", "user.name"]);
      const email = await optionalGitOutput(root, ["config", "user.email"]);
      if (!name || !email) throw new Error("Git user.name and user.email must be configured before committing.");
      const statusBeforeChecks = await gitOutput(root, ["status", "--porcelain=v1", "-z", "-uall"]);
      if (!options.skipTests) {
        console.log("\nRunning npm run ci before staging...");
        await runNpmScript(root, "ci");
      } else console.warn("\n[WARN] Verification skipped by --skip-tests.");
      const statusAfterChecks = await gitOutput(root, ["status", "--porcelain=v1", "-z", "-uall"]);
      if (statusAfterChecks !== statusBeforeChecks) throw new Error("Files changed while verification was running. Review the new status and run the uploader again.");
      await git(root, ["add", "--all"]);
      const staged = await optionalGitOutput(root, ["diff", "--cached", "--name-only"]);
      if (!staged) console.log("No staged changes were produced.");
      else {
        console.log("\nStaged summary:");
        console.log(await gitOutput(root, ["diff", "--cached", "--stat"]));
        let message = validateCommitMessage(options.message);
        if (!message && !options.yes && process.stdin.isTTY) {
          const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
          try { message = validateCommitMessage(await prompt.question(`Commit message [${defaultCommitMessage()}]: `)); } finally { prompt.close(); }
        }
        message ||= defaultCommitMessage();
        await runInherited("git", ["commit", "-m", message], root);
        console.log(`Created commit: ${message}`);
      }
    }

    const refreshed = await remoteState(root, remote, branch, true);
    if (refreshed.exists && refreshed.behind > 0) throw new Error(`${remote}/${branch} changed during the upload. Your local commit is safe; pull before retrying.`);
    const pushArgs = refreshed.exists ? ["push", "--porcelain", remote, `HEAD:refs/heads/${branch}`] : ["push", "--porcelain", "--set-upstream", remote, `HEAD:refs/heads/${branch}`];
    console.log(`\nPushing to ${remote}/${branch}...`);
    await runInherited("git", pushArgs, root);
    console.log(`\nGitHub upload completed.\nCommit: ${await gitOutput(root, ["rev-parse", "--short", "HEAD"])}\nStatus: ${await gitOutput(root, ["status", "--short", "--branch"]) || "clean"}`);
    return 0;
  } finally {
    process.removeListener("exit", cleanup);
    releaseLock();
  }
}

if (require.main === module) main().then(code => { process.exitCode = code; }).catch(error => { console.error(`\n[ERROR] ${error.message}`); process.exitCode = 1; });

module.exports = { acquireLock, defaultCommitMessage, formatBytes, inspectFiles, main, parseNulList, parseOptions, riskyPathReason, runNpmScript, validateCommitMessage };
