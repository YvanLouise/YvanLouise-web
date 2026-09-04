import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import uploader from "../scripts/github-uploader.cjs";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true }).trim();
}

test("GitHub uploader parses explicit options and rejects unsafe combinations", () => {
  assert.deepEqual(uploader.parseOptions([]), { check: false, yes: false, skipTests: false, help: false, message: "" });
  assert.deepEqual(uploader.parseOptions(["--yes", "--skip-tests", "-m", "Update gallery"]), { check: false, yes: true, skipTests: true, help: false, message: "Update gallery" });
  assert.equal(uploader.parseOptions(["--help"]).help, true);
  assert.throws(() => uploader.parseOptions(["--check", "--yes"]), /cannot be combined/);
  assert.throws(() => uploader.parseOptions(["--message"]), /requires a commit message/);
  assert.throws(() => uploader.parseOptions(["--force"]), /Unknown option/);
});

test("GitHub uploader validates commit messages without shell interpolation", () => {
  assert.equal(uploader.validateCommitMessage(" Fix gallery & publish "), "Fix gallery & publish");
  assert.equal(uploader.validateCommitMessage(""), "");
  assert.throws(() => uploader.validateCommitMessage("first\nsecond"), /single line/);
  assert.throws(() => uploader.validateCommitMessage("x".repeat(121)), /120 characters/);
  assert.equal(uploader.defaultCommitMessage(new Date(2026, 8, 5, 7, 8, 9)), "Update website 2026-09-05 07:08:09");
});

test("GitHub uploader identifies credential paths and parses NUL-delimited names", () => {
  for (const file of [".env", "backend/.env.production", "keys/id_rsa", "cert/site.pem", "cert/site.p12"]) assert.ok(uploader.riskyPathReason(file));
  for (const file of ["backend/.env.example", "public-site/.env.production.example", "src/key.ts"]) assert.equal(uploader.riskyPathReason(file), null);
  assert.deepEqual(uploader.parseNulList("normal.txt\0folder/file with spaces.txt\0中文.png\0"), ["normal.txt", "folder/file with spaces.txt", "中文.png"]);
  assert.equal(uploader.formatBytes(30 * 1024 * 1024), "30.0 MB");
});

test("GitHub uploader starts npm scripts through the Windows command bridge", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-uploader-npm-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    private: true,
    scripts: { verify: "node -e \"require('fs').writeFileSync('verification.txt','ok')\"" }
  }));
  await uploader.runNpmScript(root, "verify");
  assert.equal(fs.readFileSync(path.join(root, "verification.txt"), "utf8"), "ok");
  await assert.rejects(uploader.runNpmScript(root, "verify & unsafe"), /Invalid npm script name/);
});

test("GitHub uploader commits and pushes safely to a temporary remote", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-uploader-test-"));
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "workspace with spaces");
  fs.mkdirSync(work);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ["init", "--bare", remote]);
  git(work, ["init"]);
  git(work, ["config", "user.name", "Uploader Test"]);
  git(work, ["config", "user.email", "uploader@example.test"]);
  git(work, ["branch", "-M", "main"]);
  git(work, ["remote", "add", "origin", remote]);
  fs.writeFileSync(path.join(work, "README.md"), "initial\n");
  git(work, ["add", "README.md"]);
  git(work, ["commit", "-m", "Initial"]);
  git(work, ["push", "-u", "origin", "main"]);

  fs.writeFileSync(path.join(work, "file with spaces.txt"), "safe upload\n");
  await uploader.main(["--yes", "--skip-tests", "--message", "Publish safely & literally"], work);
  assert.equal(git(work, ["status", "--porcelain"]), "");
  assert.equal(git(work, ["log", "-1", "--pretty=%s"]), "Publish safely & literally");
  assert.equal(git(remote, ["show", "main:file with spaces.txt"]), "safe upload");
  assert.equal(fs.existsSync(path.join(work, ".git", "github-uploader.lock")), false);
});

test("GitHub uploader blocks modified credential files and duplicate locks", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-uploader-safety-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ["init"]);
  git(root, ["config", "user.name", "Uploader Test"]);
  git(root, ["config", "user.email", "uploader@example.test"]);
  fs.writeFileSync(path.join(root, ".env.production"), "TOKEN=placeholder\n");
  git(root, ["add", ".env.production"]);
  git(root, ["commit", "-m", "Initial"]);
  fs.appendFileSync(path.join(root, ".env.production"), "SECRET=changed\n");
  const inspection = await uploader.inspectFiles(root);
  assert.match(inspection.issues.join("\n"), /\.env\.production.*local environment file/);
  const release = await uploader.acquireLock(root);
  await assert.rejects(uploader.acquireLock(root), /already running/);
  release();
  const releaseAgain = await uploader.acquireLock(root);
  releaseAgain();
});
