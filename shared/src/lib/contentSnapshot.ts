import bundledContent from "@content/site-content.json";
import { mergePagesWithSamples, sampleSettings, sampleWorks } from "../data/sampleData";
import { SiteContentFile, SiteContentSnapshot, SiteSettings } from "../types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStringList(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [...fallback];
}

function buildSiteSettings(raw: Partial<SiteSettings> | undefined, overrides: SiteContentFile): SiteSettings {
  const base = raw ?? {};
  const featuredWorkIds = Array.isArray(overrides.featuredWorkIds)
    ? normalizeStringList(overrides.featuredWorkIds, sampleSettings.featuredWorkIds)
    : normalizeStringList(base.featuredWorkIds, sampleSettings.featuredWorkIds);

  return {
    ...sampleSettings,
    ...base,
    socialLinks: Array.isArray(base.socialLinks) ? clone(base.socialLinks) : clone(sampleSettings.socialLinks),
    musicPreviewClips: Array.isArray(base.musicPreviewClips) ? clone(base.musicPreviewClips) : clone(sampleSettings.musicPreviewClips),
    featuredWorkIds,
    uiText: overrides.uiText ?? base.uiText ?? sampleSettings.uiText
  };
}

export function normalizeSiteContent(value: SiteContentFile | null | undefined): SiteContentSnapshot {
  const raw = value ?? {};
  const works = Array.isArray(raw.works) ? clone(raw.works) : clone(sampleWorks);
  const pages = mergePagesWithSamples(Array.isArray(raw.pages) ? clone(raw.pages) : []);
  const siteSettings = buildSiteSettings(raw.siteSettings, raw);

  return {
    generatedAt: raw.generatedAt,
    works,
    pages,
    siteSettings
  };
}

const bundledSnapshot = normalizeSiteContent(bundledContent as SiteContentFile);

export function getBundledSiteContent(): SiteContentSnapshot {
  return clone(bundledSnapshot);
}

export function cloneSiteContent(snapshot: SiteContentSnapshot): SiteContentSnapshot {
  return clone(snapshot);
}

export function toSiteContentFile(snapshot: SiteContentSnapshot): SiteContentFile {
  return {
    generatedAt: snapshot.generatedAt,
    works: clone(snapshot.works),
    pages: clone(snapshot.pages),
    siteSettings: {
      ...clone(snapshot.siteSettings),
      featuredWorkIds: clone(snapshot.siteSettings.featuredWorkIds),
      uiText: clone(snapshot.siteSettings.uiText)
    },
    featuredWorkIds: clone(snapshot.siteSettings.featuredWorkIds),
    uiText: clone(snapshot.siteSettings.uiText)
  };
}
