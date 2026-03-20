import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

function getLocalContentPath() {
  return path.resolve(process.cwd(), "..", "content", "site-content.json");
}

function isNetlifyRuntime() {
  return Boolean(process.env.NETLIFY || process.env.CONTEXT || process.env.DEPLOY_ID || process.env.URL);
}

function getGithubConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;
  const filePath = process.env.CONTENT_FILE_PATH || "content/site-content.json";

  if (!owner || !repo || !token) {
    return null;
  }

  return { owner, repo, branch, token, path: filePath };
}

function serializeContent(content) {
  return `${JSON.stringify(content, null, 2)}\n`;
}

async function readLocalContent() {
  const raw = await readFile(getLocalContentPath(), "utf8");
  return JSON.parse(raw);
}

async function writeLocalContent(content) {
  await writeFile(getLocalContentPath(), serializeContent(content), "utf8");
}

async function readGithubContent(config) {
  const endpoint = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `GitHub content read failed (${response.status}).`);
  }

  const body = await response.json();
  const content = JSON.parse(Buffer.from(String(body.content || "").replace(/\n/g, ""), "base64").toString("utf8"));
  return { content, sha: body.sha };
}

async function writeGithubContent(config, content, message) {
  const current = await readGithubContent(config);
  const endpoint = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(serializeContent(content), "utf8").toString("base64"),
      branch: config.branch,
      sha: current.sha
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `GitHub content write failed (${response.status}).`);
  }
}

export async function readSiteContentSource() {
  const githubConfig = getGithubConfig();
  if (!githubConfig) {
    return {
      source: "local",
      content: await readLocalContent()
    };
  }

  const github = await readGithubContent(githubConfig);
  return {
    source: "github",
    content: github.content,
    sha: github.sha
  };
}

export async function writeSiteContentSource(content, message) {
  const nextContent = {
    ...content,
    generatedAt: content.generatedAt || new Date().toISOString()
  };

  const githubConfig = getGithubConfig();
  if (!githubConfig) {
    if (isNetlifyRuntime()) {
      throw new Error(
        "Netlify admin save is not fully configured yet. Please set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, and CONTENT_FILE_PATH in the admin-site environment variables."
      );
    }

    await writeLocalContent(nextContent);
    return {
      source: "local",
      content: nextContent
    };
  }

  await writeGithubContent(githubConfig, nextContent, message || "admin: update site content");
  return {
    source: "github",
    content: nextContent
  };
}
