export const DEFAULT_WORK_COVER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function normalizeBasePath(value: string): string {
  if (!value) {
    return "/";
  }

  let next = value.trim();
  if (!next.startsWith("/")) {
    next = `/${next}`;
  }
  if (!next.endsWith("/")) {
    next += "/";
  }
  return next;
}

function resolveRuntimeBasePath(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const currentPath = normalizeBasePath(window.location.pathname);
  const repoBase = normalizeBasePath(import.meta.env.VITE_REPOSITORY_BASE || "/YvanLouise-web/");
  const onGithubPagesHost = /\.github\.io$/i.test(window.location.hostname);
  return onGithubPagesHost && currentPath.startsWith(repoBase) ? repoBase : "/";
}

function joinWithRuntimeBase(relativePath: string): string {
  const normalized = relativePath.replace(/^\.?\/+/, "");
  const base = resolveRuntimeBasePath();
  return `${base.replace(/\/$/, "")}/${normalized}`;
}

function toRelativeUploadPath(value: string): string | null {
  const trimmed = value.trim();
  const localhostMatch = trimmed.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/uploads\/(.+)$/i);
  if (localhostMatch?.[1]) {
    return `uploads/${localhostMatch[1]}`;
  }

  if (/^\/?uploads\//i.test(trimmed)) {
    return trimmed.replace(/^\//, "");
  }

  return null;
}

export function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

export function resolveMediaUrl(url?: string | null): string {
  if (!hasText(url)) {
    return "";
  }

  const trimmed = url!.trim();
  if (/^data:/i.test(trimmed)) {
    return trimmed;
  }

  const relativeUploadPath = toRelativeUploadPath(trimmed);
  if (relativeUploadPath) {
    return joinWithRuntimeBase(relativeUploadPath);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return joinWithRuntimeBase(trimmed);
}

export function resolveWorkCoverUrl(coverUrl?: string | null): string {
  return hasText(coverUrl) ? resolveMediaUrl(coverUrl) : DEFAULT_WORK_COVER;
}
