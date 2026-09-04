import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { normalizePublicPath } from "./publicPaths.js";

const execFileAsync = promisify(execFile);
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");

let pendingPaths = new Set<string>();
let pendingReason = "Sync public site content";
let publishTimer: NodeJS.Timeout | null = null;
let publishInFlight = false;
let publishQueuedWhileRunning = false;

function formatTimestamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function runGit(args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync("git", ["--literal-pathspecs", ...args], {
    cwd: repoRoot,
    windowsHide: true
  });

  return `${stdout ?? ""}${stderr ?? ""}`.trim();
}

async function pushPublicSiteChanges(paths: string[], reason: string): Promise<void> {
  if (!config.autoPublishPublicSite || paths.length === 0) {
    return;
  }

  try {
    const statusOutput = await runGit(["status", "--porcelain", "--", ...paths]);
    if (!statusOutput.trim()) {
      return;
    }

    await runGit(["add", "--", ...paths]);

    const commitMessage = `${reason} (${formatTimestamp()})`;
    const commitOutput = await runGit(["commit", "-m", commitMessage, "--", ...paths]);

    if (/nothing to commit/i.test(commitOutput)) {
      return;
    }

    await runGit(["push", config.autoPublishRemote, config.autoPublishBranch]);
    console.log(`[auto-publish] Public site synced: ${paths.join(", ")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[auto-publish] Failed to sync public site. ${message}`);
  }
}

async function flushQueuedPublish(): Promise<void> {
  if (!config.autoPublishPublicSite) {
    pendingPaths.clear();
    publishTimer = null;
    return;
  }

  if (publishInFlight) {
    publishQueuedWhileRunning = true;
    return;
  }

  publishTimer = null;
  publishInFlight = true;

  const paths = Array.from(pendingPaths);
  const reason = pendingReason;
  pendingPaths.clear();
  pendingReason = "Sync public site content";

  try {
    await pushPublicSiteChanges(paths, reason);
  } finally {
    publishInFlight = false;

    if (publishQueuedWhileRunning || pendingPaths.size > 0) {
      publishQueuedWhileRunning = false;
      schedulePublicSitePublish({ paths: Array.from(pendingPaths), reason: pendingReason });
    }
  }
}

export interface PublicSitePublishTrigger {
  paths: string[];
  reason?: string;
}

export function schedulePublicSitePublish(trigger: PublicSitePublishTrigger): void {
  if (!config.autoPublishPublicSite) {
    return;
  }

  const normalizedPaths = trigger.paths.map(normalizePublicPath).filter((filePath): filePath is string => filePath !== null);
  if (!normalizedPaths.length) {
    return;
  }

  normalizedPaths.forEach((filePath) => pendingPaths.add(filePath));
  if (trigger.reason?.trim()) {
    pendingReason = trigger.reason.trim();
  }

  if (publishTimer) {
    clearTimeout(publishTimer);
  }

  publishTimer = setTimeout(() => {
    void flushQueuedPublish();
  }, config.autoPublishDebounceMs);
}
