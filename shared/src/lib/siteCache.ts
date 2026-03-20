import { sampleSettings } from "../data/sampleData";
import { PageContent, SiteSettings, Work } from "../types";

const CACHE_VERSION = "v5";
const SETTINGS_KEY = `yvanlouise:public:site-settings:${CACHE_VERSION}`;
const WORKS_KEY = `yvanlouise:public:works:${CACHE_VERSION}`;
const PAGES_KEY = `yvanlouise:public:pages:${CACHE_VERSION}`;
const LEGACY_KEYS = [
  "yvanlouise:public:site-settings",
  "yvanlouise:public:works",
  "yvanlouise:public:pages",
  "yvanlouise:public:site-settings:v2",
  "yvanlouise:public:works:v2",
  "yvanlouise:public:pages:v2"
];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clearLegacyCache(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures in privacy mode.
  }
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    clearLegacyCache();
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    clearLegacyCache();
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

export function createHydrationSafeSiteSettings(): SiteSettings {
  return {
    ...sampleSettings,
    bannerImageUrl: "",
    avatarImageUrl: ""
  };
}

export function readCachedSiteSettings(): SiteSettings | null {
  return readJson<SiteSettings>(SETTINGS_KEY);
}

export function writeCachedSiteSettings(settings: SiteSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

export function readCachedWorks(): Work[] | null {
  return readJson<Work[]>(WORKS_KEY);
}

export function writeCachedWorks(works: Work[]): void {
  writeJson(WORKS_KEY, works);
}

export function readCachedWorkById(workId: string | undefined): Work | null {
  if (!workId) {
    return null;
  }

  return readCachedWorks()?.find((work) => work.id === workId) ?? null;
}

export function mergeCachedWork(work: Work): void {
  const current = readCachedWorks() ?? [];
  const exists = current.some((item) => item.id === work.id);
  const next = exists ? current.map((item) => (item.id === work.id ? work : item)) : [...current, work];
  writeCachedWorks(next);
}

function readCachedPageMap(): Record<string, PageContent> {
  return readJson<Record<string, PageContent>>(PAGES_KEY) ?? {};
}

export function readCachedPage(slug: string): PageContent | null {
  const pages = readCachedPageMap();
  return pages[slug] ?? null;
}

export function writeCachedPage(page: PageContent): void {
  const pages = readCachedPageMap();
  pages[page.slug] = page;
  writeJson(PAGES_KEY, pages);
}


