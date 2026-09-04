import path from "node:path";

const contentFiles = new Set(["content/site-content.json", "content/public/site-content.json"]);

export function normalizePublicPath(filePath: string): string | null {
  const raw = filePath.trim().replace(/\\/g, "/");
  if (!raw || /[\u0000*?\[\]:]/.test(raw) || path.posix.isAbsolute(raw)) return null;
  const normalized = path.posix.normalize(raw);
  return contentFiles.has(normalized) || normalized.startsWith("content/public/uploads/") ? normalized : null;
}
