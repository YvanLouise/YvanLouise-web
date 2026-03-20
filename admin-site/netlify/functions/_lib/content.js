import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";

const localContentPath = fileURLToPath(new URL("../../../../content/site-content.json", import.meta.url));

function getGithubConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;
  const path = process.env.CONTENT_FILE_PATH || "content/site-content.json";

  if (!owner || !repo || !token) {
    return null;
  }

  return { owner, repo, branch, token, path };
}

function serializeContent(content) {
  return `${JSON.stringify(content, null, 2)}\n`;
}

async function readLocalContent() {
  const raw = await readFile(localContentPath, "utf8");
  return JSON.parse(raw);
}

async function writeLocalContent(content) {
  await writeFile(localContentPath, serializeContent(content), "utf8");
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
    throw new Error(`读取 GitHub 内容文件失败（${response.status}）。`);
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
    const text = await response.text();
    throw new Error(text || `写入 GitHub 内容文件失败（${response.status}）。`);
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
