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

export function workDetailCollection(value: unknown, workId: string): { work?: Work; works: Work[] } {
  if (!Array.isArray(value)) throw new Error("作品数据格式异常，请稍后重试。");
  const candidate = value.find(item => item && typeof item === "object" && item.id === workId);
  if (candidate && !isWorkDetail(candidate)) throw new Error("当前作品数据不完整，请稍后重试。");
  return { work: candidate, works: value.filter(isWorkDetail) };
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

export function workReadingMinutes(work: Work): number {
  const text = [work.detailIntro, work.background, work.process, work.result,
    ...work.featureList, ...work.interactionPoints, ...work.detailSections.map(section => section.body)].join(" ");
  const characters = text.replace(/\s/g, "").length;
  return characters ? Math.max(1, Math.ceil(characters / 400)) : 0;
}

export function workTextParts(text: string): { text: string; href?: string }[] {
  return text.split(/(https?:\/\/[^\s<>\u3000-\u303f\uff00-\uffef]+)/gi).filter(Boolean).flatMap(part => {
    if (!/^https?:\/\//i.test(part)) return [{ text: part }];
    const url = part.replace(/[.,;:!?]+$/, "");
    const href = safeWorkLink(url);
    if (!href) return [{ text: part }];
    return [{ text: url, href }, ...(url.length < part.length ? [{ text: part.slice(url.length) }] : [])];
  });
}
