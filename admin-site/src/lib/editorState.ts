import type { SiteSettings, Work, WorkDetailSection } from "../types";

export function parseSocialLinksText(value: string, strict = false): SiteSettings["socialLinks"] {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
    const separator = line.indexOf("|");
    const label = separator < 0 ? line : line.slice(0, separator).trim();
    const url = separator < 0 ? "" : line.slice(separator + 1).trim();
    if (strict) {
      let valid = false;
      try { valid = ["http:", "https:", "mailto:"].includes(new URL(url).protocol); } catch { /* Report below. */ }
      if (!label || !valid) throw new Error(`第 ${index + 1} 行社交链接不完整，请使用“名称|URL”格式。`);
    }
    return { label, url };
  }).filter(link => link.label && link.url);
}

export type WorkTextFields = Record<"featureList" | "interactionPoints" | "galleryImages" | "detailSections", string>;

export function workTextFields(work: Partial<Work>): WorkTextFields {
  return {
    featureList: (work.featureList ?? []).join("\n"),
    interactionPoints: (work.interactionPoints ?? []).join("\n"),
    galleryImages: (work.galleryImages ?? []).join("\n"),
    detailSections: (work.detailSections ?? []).map(section => `${section.title}\n${section.body}`).join("\n\n")
  };
}

export function parseWorkText(text: WorkTextFields): Pick<Work, keyof WorkTextFields> {
  const lines = (value: string): string[] => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const detailSections: WorkDetailSection[] = text.detailSections.split(/\r?\n\s*\r?\n/).map(block => block.trim()).filter(Boolean).map(block => {
    const [title, ...body] = block.split(/\r?\n/);
    if (!body.join("\n").trim()) throw new Error(`补充区块“${title}”缺少正文，请在标题下方换行填写。`);
    return { title, body: body.join("\n").trim() };
  });
  const result = { featureList: lines(text.featureList), interactionPoints: lines(text.interactionPoints), galleryImages: lines(text.galleryImages), detailSections };
  if (result.featureList.length > 12 || result.interactionPoints.length > 12) throw new Error("功能和交互亮点分别最多 12 条。");
  if (result.galleryImages.length > 20) throw new Error("每个作品最多 20 张图集图片。");
  if (detailSections.length > 8) throw new Error("详情补充区块最多 8 个。");
  return result;
}

// Advance only fields that still equal the submitted draft; preserve later edits.
export function mergeSaved<T extends object>(draft: T, submitted: T, saved: T): T {
  const next = { ...draft };
  for (const key of Object.keys(saved) as (keyof T)[]) {
    if (JSON.stringify(draft[key]) === JSON.stringify(submitted[key])) next[key] = saved[key];
  }
  return next;
}

export function parseUiText(value: string, template: SiteSettings["uiText"]): SiteSettings["uiText"] {
  const parsed: unknown = JSON.parse(value);
  function validate(candidate: unknown, expected: unknown, path: string): void {
    if (typeof expected === "string") {
      if (typeof candidate !== "string") throw new Error(`${path} 必须是文本。`);
    } else if (Array.isArray(expected)) {
      if (!Array.isArray(candidate) || candidate.some(item => typeof item !== "string")) throw new Error(`${path} 必须是文本数组。`);
    } else if (expected && typeof expected === "object") {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error(`${path} 必须是对象。`);
      for (const [key, item] of Object.entries(expected)) validate((candidate as Record<string, unknown>)[key], item, `${path}.${key}`);
    }
  }
  validate(parsed, template, "界面文案");
  return parsed as SiteSettings["uiText"];
}

export function filterAdminWorks(works: Work[], query: string, type: string, sort: string): Work[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const result = works.filter(work => (type === "all" || work.type === type) && terms.every(term =>
    `${work.title} ${work.summary} ${work.platform ?? ""} ${work.status ?? ""}`.toLocaleLowerCase().includes(term)));
  if (sort === "title") result.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  if (sort === "date") result.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return result;
}
