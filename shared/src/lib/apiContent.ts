import { SiteContentSnapshot, SiteSettings } from "../types";
import { cloneSiteContent, getBundledSiteContent, normalizeSiteContent, toSiteContentFile } from "./contentSnapshot";
import { PUBLIC_CONTENT_BASE, STATIC_CONTENT_URL, STATIC_PUBLIC_SITE_MODE } from "./apiEnvironment";
import { requestJson } from "./requestJson";
import { adminFunctionRequest } from "./apiRequests";
import { writeCachedPage, writeCachedSiteSettings, writeCachedWorks } from "./siteCache";

let adminContentCache: SiteContentSnapshot | null = null;
let publicContentCache: SiteContentSnapshot | null = null;
let publicContentRequest: Promise<SiteContentSnapshot> | null = null;
let publicContentExpiresAt = 0;

function nowIso(): string {
  return new Date().toISOString();
}

function syncSnapshotCaches(snapshot: SiteContentSnapshot): void {
  writeCachedWorks(snapshot.works);
  writeCachedSiteSettings(snapshot.siteSettings);
  snapshot.pages.forEach((page) => writeCachedPage(page));
}

function updateAdminContentCache(snapshot: SiteContentSnapshot): SiteContentSnapshot {
  const next = cloneSiteContent(snapshot);
  adminContentCache = next;
  syncSnapshotCaches(next);
  return cloneSiteContent(next);
}

async function fetchPublicContentSnapshot(): Promise<SiteContentSnapshot> {
  if (STATIC_PUBLIC_SITE_MODE) {
    const body = await requestJson<ReturnType<typeof toSiteContentFile>>(STATIC_CONTENT_URL, { cache: "no-cache" });
    return normalizeSiteContent(body);
  }

  const body = await requestJson<{ content?: unknown }>(`${PUBLIC_CONTENT_BASE}/public-content`);
  return normalizeSiteContent((body.content ?? {}) as ReturnType<typeof toSiteContentFile>);
}

export function getStaticContentSnapshot(): SiteContentSnapshot {
  return getBundledSiteContent();
}

export function getStaticSiteSettings(): SiteSettings {
  return getStaticContentSnapshot().siteSettings;
}

export async function loadPublicContent(force = false): Promise<SiteContentSnapshot> {
  if (publicContentCache && !force && Date.now() < publicContentExpiresAt) {
    return cloneSiteContent(publicContentCache);
  }

  if (!publicContentRequest) {
    publicContentRequest = fetchPublicContentSnapshot()
      .then((snapshot) => {
        publicContentExpiresAt = Date.now() + 60000;
        publicContentCache = cloneSiteContent(snapshot);
        syncSnapshotCaches(snapshot);
        return snapshot;
      })
      .catch(() => {
        publicContentExpiresAt = Date.now() + 5000;
        if (publicContentCache) {
          return publicContentCache;
        }

        const fallback = getStaticContentSnapshot();
        publicContentCache = cloneSiteContent(fallback);
        syncSnapshotCaches(fallback);
        return fallback;
      });
  }

  const request = publicContentRequest;

  try {
    return cloneSiteContent(await request);
  } finally {
    if (publicContentRequest === request) {
      publicContentRequest = null;
    }
  }
}

export async function loadAdminContent(force = false): Promise<SiteContentSnapshot> {
  if (adminContentCache && !force) {
    return cloneSiteContent(adminContentCache);
  }

  const response = await adminFunctionRequest<{ content: unknown }>("/admin-content");
  const snapshot = normalizeSiteContent(response.content as ReturnType<typeof toSiteContentFile>);
  return updateAdminContentCache(snapshot);
}

export async function saveAdminContent(snapshot: SiteContentSnapshot, message: string): Promise<SiteContentSnapshot> {
  const payload = {
    content: {
      ...toSiteContentFile(snapshot),
      generatedAt: nowIso()
    },
    message
  };

  const response = await adminFunctionRequest<{ content: unknown }>("/admin-content", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  const savedSnapshot = normalizeSiteContent(response.content as ReturnType<typeof toSiteContentFile>);
  return updateAdminContentCache(savedSnapshot);
}

export function clearAdminContentCache(): void {
  adminContentCache = null;
}
