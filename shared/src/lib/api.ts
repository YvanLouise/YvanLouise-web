import {
  AdminCredentials,
  Message,
  MessageInput,
  PageContent,
  Review,
  ReviewInput,
  SiteContentSnapshot,
  SiteSettings,
  Work,
  WorkDetailSection,
  WorkType
} from "../types";
import { getSamplePage, mergePagesWithSamples, sampleWorks } from "../data/sampleData";
import {
  createHydrationSafeSiteSettings,
  mergeCachedWork,
  readCachedPage,
  readCachedSiteSettings,
  readCachedWorkById,
  readCachedWorks,
  writeCachedPage,
  writeCachedSiteSettings,
  writeCachedWorks
} from "./siteCache";
import { clearAdminContentCache, loadAdminContent, loadPublicContent, saveAdminContent } from "./apiContent";
import { LEGACY_BACKEND_MODE } from "./apiEnvironment";
import { ApiError } from "./apiError";
import { adminFunctionRequest, legacyRequest, publicFunctionRequest } from "./apiRequests";

const IMAGE_MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const AUDIO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function nowIso(): string {
  return new Date().toISOString();
}


function todayDate(): string {
  return nowIso().slice(0, 10);
}

function generateId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function normalizeDetailSections(value: unknown): WorkDetailSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<WorkDetailSection>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const body = typeof record.body === "string" ? record.body.trim() : "";
      return title && body ? { title, body } : null;
    })
    .filter((item): item is WorkDetailSection => Boolean(item));
}

function createWorkFromPayload(payload: Partial<Work>): Work {
  return {
    id: payload.id?.trim() || generateId("work"),
    title: payload.title?.trim() || "Untitled Work",
    type: payload.type ?? "software",
    summary: payload.summary?.trim() ?? "",
    detailIntro: payload.detailIntro?.trim() ?? "",
    background: payload.background?.trim() ?? "",
    process: payload.process?.trim() ?? "",
    result: payload.result?.trim() ?? "",
    featureList: normalizeStringArray(payload.featureList),
    interactionPoints: normalizeStringArray(payload.interactionPoints),
    galleryImages: normalizeStringArray(payload.galleryImages),
    detailSections: normalizeDetailSections(payload.detailSections),
    platform: payload.platform?.trim() || undefined,
    status: payload.status?.trim() || undefined,
    coverUrl: payload.coverUrl?.trim() ?? "",
    demoUrl: payload.demoUrl?.trim() || undefined,
    repoUrl: payload.repoUrl?.trim() || undefined,
    publishedAt: payload.publishedAt ?? todayDate()
  };
}

function mergeWork(existing: Work, patch: Partial<Work>): Work {
  return {
    ...existing,
    title: patch.title !== undefined ? patch.title.trim() || "Untitled Work" : existing.title,
    type: patch.type ?? existing.type,
    summary: patch.summary !== undefined ? patch.summary.trim() : existing.summary,
    detailIntro: patch.detailIntro !== undefined ? patch.detailIntro.trim() : existing.detailIntro,
    background: patch.background !== undefined ? patch.background.trim() : existing.background,
    process: patch.process !== undefined ? patch.process.trim() : existing.process,
    result: patch.result !== undefined ? patch.result.trim() : existing.result,
    featureList: patch.featureList !== undefined ? normalizeStringArray(patch.featureList) : existing.featureList,
    interactionPoints: patch.interactionPoints !== undefined ? normalizeStringArray(patch.interactionPoints) : existing.interactionPoints,
    galleryImages: patch.galleryImages !== undefined ? normalizeStringArray(patch.galleryImages) : existing.galleryImages,
    detailSections: patch.detailSections !== undefined ? normalizeDetailSections(patch.detailSections) : existing.detailSections,
    platform: patch.platform !== undefined ? patch.platform.trim() || undefined : existing.platform,
    status: patch.status !== undefined ? patch.status.trim() || undefined : existing.status,
    coverUrl: patch.coverUrl !== undefined ? patch.coverUrl.trim() : existing.coverUrl,
    demoUrl: patch.demoUrl !== undefined ? patch.demoUrl.trim() || undefined : existing.demoUrl,
    repoUrl: patch.repoUrl !== undefined ? patch.repoUrl.trim() || undefined : existing.repoUrl,
    publishedAt: patch.publishedAt ?? existing.publishedAt
  };
}

function ensureUploadWithinLimit(file: File): void {
  const maxBytes = file.type.startsWith("audio/") ? AUDIO_MAX_UPLOAD_BYTES : IMAGE_MAX_UPLOAD_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    const kind = file.type.startsWith("audio/") ? "audio" : "image";
    throw new Error(`${kind} file is too large. Please keep it within ${maxMb}MB.`);
  }
}

export async function getWorks(type?: WorkType): Promise<Work[]> {
  if (LEGACY_BACKEND_MODE) {
    const params = type ? `?type=${type}` : "";

    try {
      const works = await legacyRequest<Work[]>(`/api/works${params}`);
      if (type) {
        const current = readCachedWorks() ?? [];
        const next = [...current.filter((work) => work.type !== type), ...works];
        writeCachedWorks(next);
      } else {
        writeCachedWorks(works);
      }

      return works;
    } catch {
      const cachedWorks = readCachedWorks();
      if (cachedWorks) {
        return type ? cachedWorks.filter((work) => work.type === type) : cachedWorks;
      }

      return type ? sampleWorks.filter((work) => work.type === type) : sampleWorks;
    }
  }

  try {
    const snapshot = await loadPublicContent();
    const works = type ? snapshot.works.filter((work) => work.type === type) : snapshot.works;
    if (type) {
      const current = readCachedWorks() ?? [];
      const next = [...current.filter((work) => work.type !== type), ...works];
      writeCachedWorks(next);
    } else {
      writeCachedWorks(works);
    }
    return works;
  } catch {
    const cachedWorks = readCachedWorks();
    if (cachedWorks) {
      return type ? cachedWorks.filter((work) => work.type === type) : cachedWorks;
    }
    return type ? sampleWorks.filter((work) => work.type === type) : sampleWorks;
  }
}

export async function getWorkById(workId: string): Promise<Work> {
  if (LEGACY_BACKEND_MODE) {
    try {
      const work = await legacyRequest<Work>(`/api/works/${workId}`);
      mergeCachedWork(work);
      return work;
    } catch {
      const cached = readCachedWorkById(workId);
      if (cached) {
        return cached;
      }

      const found = sampleWorks.find((item) => item.id === workId);
      if (!found) {
        throw new Error("Work not found.");
      }

      return found;
    }
  }
  try {
    const snapshot = await loadPublicContent();
    const work = snapshot.works.find((item) => item.id === workId);
    if (!work) {
      throw new Error("Work not found.");
    }
    mergeCachedWork(work);
    return work;
  } catch {
    const cached = readCachedWorkById(workId);
    if (cached) {
      return cached;
    }

    const found = sampleWorks.find((item) => item.id === workId);
    if (!found) {
      throw new Error("Work not found.");
    }

    return found;
  }
}
export async function submitReview(workId: string, payload: ReviewInput): Promise<{ message: string }> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<{ message: string }>(
      `/api/works/${workId}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      () => ({ message: "Review submitted (demo mode)." })
    );
  }

  return publicFunctionRequest<{ message: string }>("/public-review", {
    method: "POST",
    body: JSON.stringify({
      workId,
      rating: payload.rating,
      comment: payload.comment,
      visitorName: payload.visitorName ?? ""
    })
  });
}

export async function submitMessage(payload: MessageInput): Promise<{ message: string }> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<{ message: string }>(
      "/api/messages",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      () => ({ message: "Message sent (demo mode)." })
    );
  }

  return publicFunctionRequest<{ message: string }>("/public-message", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getPage(slug: string): Promise<PageContent> {
  if (LEGACY_BACKEND_MODE) {
    try {
      const page = await legacyRequest<PageContent>(`/api/pages/${slug}`);
      writeCachedPage(page);
      return page;
    } catch {
      return readCachedPage(slug) ?? getSamplePage(slug);
    }
  }

  try {
    const snapshot = await loadPublicContent();
    const page = snapshot.pages.find((item) => item.slug === slug) ?? getSamplePage(slug);
    writeCachedPage(page);
    return page;
  } catch {
    return readCachedPage(slug) ?? getSamplePage(slug);
  }
}
export async function getSiteSettings(): Promise<SiteSettings> {
  if (LEGACY_BACKEND_MODE) {
    try {
      const settings = await legacyRequest<SiteSettings>("/api/site-settings");
      writeCachedSiteSettings(settings);
      return settings;
    } catch {
      return readCachedSiteSettings() ?? createHydrationSafeSiteSettings();
    }
  }

  try {
    const snapshot = await loadPublicContent();
    const settings = snapshot.siteSettings;
    writeCachedSiteSettings(settings);
    return settings;
  } catch {
    return readCachedSiteSettings() ?? createHydrationSafeSiteSettings();
  }
}

export async function adminLogin(credentials: AdminCredentials): Promise<{ message: string }> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<{ message: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });
  }

  return adminFunctionRequest<{ message: string }>("/admin-login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
}

export async function adminLogout(): Promise<void> {
  if (LEGACY_BACKEND_MODE) {
    await legacyRequest<void>("/api/admin/logout", { method: "POST" });
    return;
  }

  clearAdminContentCache();
  await adminFunctionRequest<void>("/admin-logout", { method: "POST" });
}

export async function getAdminMe(): Promise<{ authenticated: boolean; username?: string }> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<{ authenticated: boolean; username?: string }>("/api/admin/me", {}, () => ({ authenticated: false }));
  }

  return adminFunctionRequest<{ authenticated: boolean; username?: string }>("/admin-me");
}

export async function getAdminMessages(): Promise<Message[]> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<Message[]>("/api/admin/messages");
  }

  return adminFunctionRequest<Message[]>("/admin-messages");
}

export async function getAdminReviews(): Promise<Review[]> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<Review[]>("/api/admin/reviews");
  }

  return adminFunctionRequest<Review[]>("/admin-reviews");
}

export async function getAdminWorks(): Promise<Work[]> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<Work[]>("/api/admin/works");
  }

  return (await loadAdminContent()).works;
}

export async function createAdminWork(payload: Partial<Work>): Promise<Work> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<Work>("/api/admin/works", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  const snapshot = await loadAdminContent();
  const work = createWorkFromPayload(payload);
  const nextSnapshot: SiteContentSnapshot = {
    ...snapshot,
    works: [work, ...snapshot.works],
    generatedAt: nowIso()
  };

  const saved = await saveAdminContent(nextSnapshot, `admin: create work ${work.title}`);
  return saved.works.find((item) => item.id === work.id) ?? work;
}

export async function updateAdminWork(workId: string, payload: Partial<Work>): Promise<Work> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<Work>(`/api/admin/works/${workId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  const snapshot = await loadAdminContent();
  const current = snapshot.works.find((item) => item.id === workId);
  if (!current) {
    throw new ApiError("The work to update does not exist.", 404);
  }

  const updatedWork = mergeWork(current, payload);
  const nextSnapshot: SiteContentSnapshot = {
    ...snapshot,
    works: snapshot.works.map((item) => (item.id === workId ? updatedWork : item)),
    generatedAt: nowIso()
  };

  const saved = await saveAdminContent(nextSnapshot, `admin: update work ${updatedWork.title}`);
  return saved.works.find((item) => item.id === workId) ?? updatedWork;
}

export async function deleteAdminWork(workId: string): Promise<void> {
  if (LEGACY_BACKEND_MODE) {
    await legacyRequest<void>(`/api/admin/works/${workId}`, { method: "DELETE" });
    return;
  }

  const snapshot = await loadAdminContent();
  const work = snapshot.works.find((item) => item.id === workId);
  if (!work) {
    throw new ApiError("The work to delete does not exist.", 404);
  }

  const nextSnapshot: SiteContentSnapshot = {
    ...snapshot,
    works: snapshot.works.filter((item) => item.id !== workId),
    generatedAt: nowIso()
  };

  await saveAdminContent(nextSnapshot, `admin: delete work ${work.title}`);
}

export async function getAdminPages(): Promise<PageContent[]> {
  if (LEGACY_BACKEND_MODE) {
    const pages = await legacyRequest<PageContent[]>("/api/admin/pages");
    return mergePagesWithSamples(pages);
  }

  return mergePagesWithSamples((await loadAdminContent()).pages);
}

export async function updateAdminPage(slug: string, payload: Partial<PageContent>): Promise<PageContent> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<PageContent>(`/api/admin/pages/${slug}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  const snapshot = await loadAdminContent();
  const fallback = snapshot.pages.find((page) => page.slug === slug) ?? getSamplePage(slug);
  const updatedPage: PageContent = {
    slug,
    title: payload.title ?? fallback.title,
    hero: payload.hero ?? fallback.hero,
    body: payload.body ?? fallback.body,
    highlights: payload.highlights ?? fallback.highlights,
    updatedAt: nowIso()
  };

  const nextPages = snapshot.pages.some((page) => page.slug === slug)
    ? snapshot.pages.map((page) => (page.slug === slug ? updatedPage : page))
    : [...snapshot.pages, updatedPage];

  const saved = await saveAdminContent(
    {
      ...snapshot,
      pages: mergePagesWithSamples(nextPages),
      generatedAt: nowIso()
    },
    `admin: update page ${slug}`
  );

  return saved.pages.find((page) => page.slug === slug) ?? updatedPage;
}

export async function getAdminSiteSettings(): Promise<SiteSettings> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<SiteSettings>("/api/admin/site-settings");
  }

  return (await loadAdminContent()).siteSettings;
}

export async function updateAdminSiteSettings(payload: SiteSettings): Promise<SiteSettings> {
  if (LEGACY_BACKEND_MODE) {
    return legacyRequest<SiteSettings>("/api/admin/site-settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  const snapshot = await loadAdminContent();
  const nextSnapshot: SiteContentSnapshot = {
    ...snapshot,
    siteSettings: clone(payload),
    generatedAt: nowIso()
  };

  const saved = await saveAdminContent(nextSnapshot, "admin: update site settings");
  return saved.siteSettings;
}

export async function uploadAdminAsset(file: File, slot: string): Promise<{ url: string; fileName: string }> {
  ensureUploadWithinLimit(file);
  if (!file.size || !/^(image|audio)\//.test(file.type)) throw new Error("请选择非空的图片或音频文件。");
  if (LEGACY_BACKEND_MODE) {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to read file."));
          return;
        }
        const [, base64 = ""] = result.split(",");
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

    return legacyRequest<{ url: string; fileName: string }>("/api/admin/assets", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64,
        slot
      })
    });
  }

  const signature = await adminFunctionRequest<{
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
    resourceType: "image" | "video";
  }>("/admin-upload-signature", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      slot
    })
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("public_id", signature.publicId);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`, {
    method: "POST",
    body: formData
  });

  const uploadBody = (await uploadResponse.json().catch(() => ({}))) as { secure_url?: string; original_filename?: string; error?: { message?: string } };
  if (!uploadResponse.ok || !uploadBody.secure_url) {
    throw new ApiError(uploadBody.error?.message ?? "Media upload failed.", uploadResponse.status || 500);
  }

  return {
    url: uploadBody.secure_url,
    fileName: uploadBody.original_filename ? `${uploadBody.original_filename}` : file.name
  };
}

export { ApiError };

