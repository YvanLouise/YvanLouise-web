import type { Work } from "../types";

export function isWorkDetail(value: unknown): value is Work {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const work = value as Record<string, unknown>;
  return ["id", "title", "summary", "detailIntro", "background", "process", "result", "coverUrl", "publishedAt"].every(key => typeof work[key] === "string")
    && ["music", "software", "game", "animation"].includes(work.type as string)
    && ["platform", "status", "demoUrl", "repoUrl"].every(key => work[key] === undefined || typeof work[key] === "string")
    && ["featureList", "interactionPoints", "galleryImages"].every(key => Array.isArray(work[key]) && work[key].every(item => typeof item === "string"))
    && Array.isArray(work.detailSections) && work.detailSections.every(section => section && typeof section.title === "string" && typeof section.body === "string");
}

export function safeWorkLink(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function workGallerySources(work: Work): string[] {
  return [...new Set([work.coverUrl, ...work.galleryImages].map(value => value.trim())
    .filter(value => /^\/?uploads\//i.test(value) || /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value) || Boolean(safeWorkLink(value))))];
}

export function relatedWorks(works: Work[], current: Work, limit = 3): Work[] {
  return works.filter(work => work.id !== current.id)
    .sort((a, b) => Number(b.type === current.type) - Number(a.type === current.type) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

export function workListReturnTo(value: unknown): string {
  if (typeof value !== "string" || !/^\/works(?:\?|$)/.test(value)) return "/works";
  return value;
}

export function displayWorkDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}
