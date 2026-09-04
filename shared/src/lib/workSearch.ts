import type { Work, WorkType } from "../types";

export const workTypes: WorkType[] = ["music", "software", "game", "animation"];
export type WorkFilter = "all" | WorkType;
export type WorkSort = "newest" | "oldest" | "title";
export function parseWorkFilter(value: string | null): WorkFilter {
  return workTypes.includes(value as WorkType) ? value as WorkType : "all";
}
export function filterWorks(works: Work[], filter: WorkFilter, query: string, sort: WorkSort): Work[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return works.filter((work) => {
    if (filter !== "all" && work.type !== filter) return false;
    const searchable = [work.title, work.summary, work.platform, work.status, ...work.featureList].join(" ").toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  }).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "zh-CN") :
    sort === "oldest" ? a.publishedAt.localeCompare(b.publishedAt) : b.publishedAt.localeCompare(a.publishedAt));
}
