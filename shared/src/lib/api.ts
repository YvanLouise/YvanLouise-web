import {
  AdminCredentials,
  Message,
  MessageInput,
  MusicPreviewClip,
  PageContent,
  Review,
  ReviewInput,
  SiteSettings,
  SiteUiText,
  SocialLink,
  Work,
  WorkDetailSection,
  WorkType
} from "../types";
import { getSamplePage, mergePagesWithSamples, samplePages, sampleWorks } from "../data/sampleData";
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
import { getSupabaseClient } from "./supabase";

interface WorkRow {
  id: string;
  title: string;
  type: WorkType;
  summary: string;
  detail_intro: string;
  background: string;
  process: string;
  result: string;
  feature_list: string[] | null;
  interaction_points: string[] | null;
  gallery_images: string[] | null;
  detail_sections: WorkDetailSection[] | null;
  platform: string | null;
  status: string | null;
  cover_url: string;
  demo_url: string | null;
  repo_url: string | null;
  published_at: string;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ReviewRow {
  id: string;
  work_id: string;
  rating: number;
  comment: string;
  visitor_name?: string | null;
  owner_only?: boolean | null;
  created_at?: string | null;
}

interface MessageRow {
  id: string;
  name: string;
  contact: string;
  subject: string;
  body: string;
  status?: "new" | "read" | "archived" | null;
  created_at?: string | null;
}

interface PageRow {
  slug: string;
  title: string;
  hero: string;
  body: string;
  highlights?: string[] | null;
  updated_at?: string | null;
}

interface SiteSettingsRow {
  id: string;
  site_title: string;
  tagline: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  banner_badge: string;
  banner_headline: string;
  banner_description: string;
  banner_image_url: string;
  avatar_image_url: string;
  afdian_url: string;
  social_links?: SocialLink[] | null;
  music_preview_clips?: MusicPreviewClip[] | null;
  featured_work_ids?: string[] | null;
  ui_text?: SiteUiText | null;
  updated_at?: string | null;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (configured) {
    if (typeof window !== "undefined") {
      try {
        const configuredUrl = new URL(configured);
        const currentUrl = new URL(window.location.origin);

        if (isLocalHostname(configuredUrl.hostname) && isLocalHostname(currentUrl.hostname)) {
          configuredUrl.hostname = currentUrl.hostname;
          configuredUrl.protocol = currentUrl.protocol;
          return configuredUrl.toString().replace(/\/$/, "");
        }
      } catch {
        return configured;
      }
    }

    return configured;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

const API_BASE = resolveApiBase();
const STORAGE_BUCKET = "site-media";
const IMAGE_MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const AUDIO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const DEFAULT_SETTINGS_ID = "default";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function toApiError(message: string, status = 500): ApiError {
  return new ApiError(message, status);
}

function mapSupabaseError(error: { message: string; status?: number | string } | null, fallback: string): ApiError {
  if (!error) {
    return toApiError(fallback);
  }

  const rawMessage = error.message || fallback;
  const lower = rawMessage.toLowerCase();
  const friendlyMessage =
    lower.includes("invalid login credentials") || lower.includes("email not confirmed")
      ? "登录失败，请检查管理员邮箱和密码。"
      : lower.includes("row-level security") || lower.includes("jwt") || lower.includes("not authenticated")
        ? "请先登录开发者站。"
        : rawMessage;
  const status = Number(error.status ?? 500);
  return new ApiError(friendlyMessage, Number.isFinite(status) ? status : 500);
}

async function legacyRequest<T>(path: string, options: RequestInit = {}, fallback?: () => T): Promise<T> {
  const endpoint = `${API_BASE}${path}`;

  try {
    const response = await fetch(endpoint, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      },
      ...options
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new ApiError(body.message ?? "请求失败", response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (fallback) {
      return fallback();
    }

    throw error;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("读取文件失败"));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayDate(): string {
  return nowIso().slice(0, 10);
}

function generateId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "asset";
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
      if (!title || !body) {
        return null;
      }

      return { title, body };
    })
    .filter((item): item is WorkDetailSection => Boolean(item));
}

function normalizeSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<SocialLink>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const url = typeof record.url === "string" ? record.url.trim() : "";
      if (!label || !url) {
        return null;
      }

      return { label, url };
    })
    .filter((item): item is SocialLink => Boolean(item));
}

function normalizeMusicPreviewClips(value: unknown): MusicPreviewClip[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<MusicPreviewClip>;
      const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : generateId("clip");
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const sourceUrl = typeof record.sourceUrl === "string" ? record.sourceUrl.trim() : "";
      const sourceName = typeof record.sourceName === "string" ? record.sourceName.trim() : "";
      const startTime = Number(record.startTime ?? 0);
      const endTime = Number(record.endTime ?? 0);

      if (!label || !sourceUrl || !sourceName || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        return null;
      }

      return {
        id,
        label,
        sourceUrl,
        sourceName,
        startTime,
        endTime
      };
    })
    .filter((item): item is MusicPreviewClip => Boolean(item));
}

function normalizeWorkType(value: unknown): WorkType {
  return value === "music" || value === "software" || value === "game" || value === "animation" ? value : "software";
}

function mapWorkRowToWork(row: Partial<WorkRow>): Work {
  return {
    id: row.id ?? generateId("work"),
    title: row.title?.trim() || "未命名作品",
    type: normalizeWorkType(row.type),
    summary: row.summary ?? "",
    detailIntro: row.detail_intro ?? "",
    background: row.background ?? "",
    process: row.process ?? "",
    result: row.result ?? "",
    featureList: normalizeStringArray(row.feature_list),
    interactionPoints: normalizeStringArray(row.interaction_points),
    galleryImages: normalizeStringArray(row.gallery_images),
    detailSections: normalizeDetailSections(row.detail_sections),
    platform: row.platform || undefined,
    status: row.status || undefined,
    coverUrl: row.cover_url ?? "",
    demoUrl: row.demo_url || undefined,
    repoUrl: row.repo_url || undefined,
    publishedAt: row.published_at ?? todayDate()
  };
}

function mapReviewRowToReview(row: Partial<ReviewRow>): Review {
  return {
    id: row.id ?? generateId("review"),
    workId: row.work_id ?? "",
    rating: Number(row.rating ?? 5),
    comment: row.comment ?? "",
    visitorName: row.visitor_name || undefined,
    ownerOnly: row.owner_only !== false,
    createdAt: row.created_at ?? nowIso()
  };
}

function mapMessageRowToMessage(row: Partial<MessageRow>): Message {
  const status = row.status === "read" || row.status === "archived" ? row.status : "new";

  return {
    id: row.id ?? generateId("message"),
    name: row.name ?? "",
    contact: row.contact ?? "",
    subject: row.subject ?? "",
    body: row.body ?? "",
    status,
    createdAt: row.created_at ?? nowIso()
  };
}

function mapPageRowToPage(row: Partial<PageRow>): PageContent {
  return {
    slug: row.slug ?? "home",
    title: row.title ?? "",
    hero: row.hero ?? "",
    body: row.body ?? "",
    highlights: normalizeStringArray(row.highlights),
    updatedAt: row.updated_at ?? nowIso()
  };
}

function mapSiteSettingsRowToSettings(row: Partial<SiteSettingsRow>): SiteSettings {
  const fallback = createHydrationSafeSiteSettings();

  return {
    siteTitle: row.site_title ?? fallback.siteTitle,
    tagline: row.tagline ?? fallback.tagline,
    primaryCtaLabel: row.primary_cta_label ?? fallback.primaryCtaLabel,
    primaryCtaHref: row.primary_cta_href ?? fallback.primaryCtaHref,
    secondaryCtaLabel: row.secondary_cta_label ?? fallback.secondaryCtaLabel,
    secondaryCtaHref: row.secondary_cta_href ?? fallback.secondaryCtaHref,
    bannerBadge: row.banner_badge ?? fallback.bannerBadge,
    bannerHeadline: row.banner_headline ?? fallback.bannerHeadline,
    bannerDescription: row.banner_description ?? fallback.bannerDescription,
    bannerImageUrl: row.banner_image_url ?? fallback.bannerImageUrl,
    avatarImageUrl: row.avatar_image_url ?? fallback.avatarImageUrl,
    afdianUrl: row.afdian_url ?? fallback.afdianUrl,
    socialLinks: normalizeSocialLinks(row.social_links),
    musicPreviewClips: normalizeMusicPreviewClips(row.music_preview_clips),
    featuredWorkIds: normalizeStringArray(row.featured_work_ids),
    uiText: (row.ui_text as SiteUiText | undefined) ?? fallback.uiText,
    updatedAt: row.updated_at ?? fallback.updatedAt
  };
}

function toWorkRow(work: Work): WorkRow {
  return {
    id: work.id,
    title: work.title,
    type: work.type,
    summary: work.summary,
    detail_intro: work.detailIntro,
    background: work.background,
    process: work.process,
    result: work.result,
    feature_list: work.featureList,
    interaction_points: work.interactionPoints,
    gallery_images: work.galleryImages,
    detail_sections: work.detailSections,
    platform: work.platform ?? "",
    status: work.status ?? "",
    cover_url: work.coverUrl,
    demo_url: work.demoUrl ?? null,
    repo_url: work.repoUrl ?? null,
    published_at: work.publishedAt,
    updated_at: nowIso()
  };
}

function createWorkFromPayload(payload: Partial<Work>): Work {
  return {
    id: payload.id?.trim() || generateId("work"),
    title: payload.title?.trim() || "未命名作品",
    type: payload.type ?? "software",
    summary: payload.summary ?? "",
    detailIntro: payload.detailIntro ?? "",
    background: payload.background ?? "",
    process: payload.process ?? "",
    result: payload.result ?? "",
    featureList: payload.featureList ?? [],
    interactionPoints: payload.interactionPoints ?? [],
    galleryImages: payload.galleryImages ?? [],
    detailSections: payload.detailSections ?? [],
    platform: payload.platform ?? "",
    status: payload.status ?? "",
    coverUrl: payload.coverUrl ?? "",
    demoUrl: payload.demoUrl || undefined,
    repoUrl: payload.repoUrl || undefined,
    publishedAt: payload.publishedAt ?? todayDate()
  };
}

function toWorkPatch(payload: Partial<Work>): Partial<WorkRow> {
  const patch: Partial<WorkRow> = {};

  if (payload.title !== undefined) patch.title = payload.title.trim() || "未命名作品";
  if (payload.type !== undefined) patch.type = payload.type;
  if (payload.summary !== undefined) patch.summary = payload.summary;
  if (payload.detailIntro !== undefined) patch.detail_intro = payload.detailIntro;
  if (payload.background !== undefined) patch.background = payload.background;
  if (payload.process !== undefined) patch.process = payload.process;
  if (payload.result !== undefined) patch.result = payload.result;
  if (payload.featureList !== undefined) patch.feature_list = payload.featureList;
  if (payload.interactionPoints !== undefined) patch.interaction_points = payload.interactionPoints;
  if (payload.galleryImages !== undefined) patch.gallery_images = payload.galleryImages;
  if (payload.detailSections !== undefined) patch.detail_sections = payload.detailSections;
  if (payload.platform !== undefined) patch.platform = payload.platform;
  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.coverUrl !== undefined) patch.cover_url = payload.coverUrl;
  if (payload.demoUrl !== undefined) patch.demo_url = payload.demoUrl || null;
  if (payload.repoUrl !== undefined) patch.repo_url = payload.repoUrl || null;
  if (payload.publishedAt !== undefined) patch.published_at = payload.publishedAt;
  patch.updated_at = nowIso();

  return patch;
}

function toPageRow(page: PageContent): PageRow {
  return {
    slug: page.slug,
    title: page.title,
    hero: page.hero,
    body: page.body,
    highlights: page.highlights,
    updated_at: nowIso()
  };
}

function toSiteSettingsRow(settings: SiteSettings): SiteSettingsRow {
  return {
    id: DEFAULT_SETTINGS_ID,
    site_title: settings.siteTitle,
    tagline: settings.tagline,
    primary_cta_label: settings.primaryCtaLabel,
    primary_cta_href: settings.primaryCtaHref,
    secondary_cta_label: settings.secondaryCtaLabel,
    secondary_cta_href: settings.secondaryCtaHref,
    banner_badge: settings.bannerBadge,
    banner_headline: settings.bannerHeadline,
    banner_description: settings.bannerDescription,
    banner_image_url: settings.bannerImageUrl,
    avatar_image_url: settings.avatarImageUrl,
    afdian_url: settings.afdianUrl,
    social_links: settings.socialLinks,
    music_preview_clips: settings.musicPreviewClips,
    featured_work_ids: settings.featuredWorkIds,
    ui_text: settings.uiText,
    updated_at: nowIso()
  };
}

function getUploadLimit(file: File): number {
  return file.type.startsWith("audio/") ? AUDIO_MAX_UPLOAD_BYTES : IMAGE_MAX_UPLOAD_BYTES;
}

function ensureUploadWithinLimit(file: File): void {
  const maxBytes = getUploadLimit(file);
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    const kind = file.type.startsWith("audio/") ? "音频" : "图片";
    throw new Error(`${kind}太大了，请控制在 ${maxMb}MB 以内。`);
  }
}

function buildStoragePath(file: File, slot: string): string {
  const sanitizedSlot = sanitizeSegment(slot || "media");
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  const fileStem = sanitizeSegment(file.name.replace(/\.[^.]+$/, ""));
  return `${sanitizedSlot}/${Date.now()}-${generateId(fileStem)}${extension}`;
}

async function legacyUploadAdminAsset(file: File, slot: string): Promise<{ url: string; fileName: string }> {
  const contentBase64 = await fileToBase64(file);

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

export async function getWorks(type?: WorkType): Promise<Work[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
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
    let query = supabase.from("works").select("*").order("published_at", { ascending: false });
    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) {
      throw mapSupabaseError(error, "读取作品失败。");
    }

    const works = (data ?? []).map((row) => mapWorkRowToWork(row as WorkRow));
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
  const supabase = getSupabaseClient();

  if (!supabase) {
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
        throw new Error("未找到作品");
      }

      return found;
    }
  }

  try {
    const { data, error } = await supabase.from("works").select("*").eq("id", workId).maybeSingle();
    if (error) {
      throw mapSupabaseError(error, "读取作品失败。");
    }

    if (!data) {
      throw new Error("未找到作品");
    }

    const work = mapWorkRowToWork(data as WorkRow);
    mergeCachedWork(work);
    return work;
  } catch {
    const cached = readCachedWorkById(workId);
    if (cached) {
      return cached;
    }

    const found = sampleWorks.find((item) => item.id === workId);
    if (!found) {
      throw new Error("未找到作品");
    }

    return found;
  }
}

export async function submitReview(workId: string, payload: ReviewInput): Promise<{ message: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<{ message: string }>(
      `/api/works/${workId}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      () => ({ message: "评分已提交（演示模式）" })
    );
  }

  const { error } = await supabase.from("reviews").insert({
    id: generateId("review"),
    work_id: workId,
    rating: payload.rating,
    comment: payload.comment,
    visitor_name: payload.visitorName ?? null,
    owner_only: true,
    created_at: nowIso()
  });

  if (error) {
    throw mapSupabaseError(error, "评分提交失败，请稍后再试。");
  }

  return { message: "评分已提交，感谢你的反馈。" };
}

export async function submitMessage(payload: MessageInput): Promise<{ message: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<{ message: string }>(
      "/api/messages",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      () => ({ message: "私信已发送（演示模式）" })
    );
  }

  const { error } = await supabase.from("messages").insert({
    id: generateId("message"),
    name: payload.name,
    contact: payload.contact,
    subject: payload.subject,
    body: payload.body,
    status: "new",
    created_at: nowIso()
  });

  if (error) {
    throw mapSupabaseError(error, "私信发送失败，请稍后再试。");
  }

  return { message: "私信已发送，我会尽快查看。" };
}

export async function getPage(slug: string): Promise<PageContent> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    try {
      const page = await legacyRequest<PageContent>(`/api/pages/${slug}`);
      writeCachedPage(page);
      return page;
    } catch {
      return readCachedPage(slug) ?? getSamplePage(slug);
    }
  }

  try {
    const { data, error } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
    if (error) {
      throw mapSupabaseError(error, "读取页面失败。");
    }

    const page = data ? mapPageRowToPage(data as PageRow) : getSamplePage(slug);
    writeCachedPage(page);
    return page;
  } catch {
    return readCachedPage(slug) ?? getSamplePage(slug);
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    try {
      const settings = await legacyRequest<SiteSettings>("/api/site-settings");
      writeCachedSiteSettings(settings);
      return settings;
    } catch {
      return readCachedSiteSettings() ?? createHydrationSafeSiteSettings();
    }
  }

  try {
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", DEFAULT_SETTINGS_ID).maybeSingle();
    if (error) {
      throw mapSupabaseError(error, "读取站点设置失败。");
    }

    const settings = data ? mapSiteSettingsRowToSettings(data as SiteSettingsRow) : createHydrationSafeSiteSettings();
    writeCachedSiteSettings(settings);
    return settings;
  } catch {
    return readCachedSiteSettings() ?? createHydrationSafeSiteSettings();
  }
}

export async function adminLogin(credentials: AdminCredentials): Promise<{ message: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<{ message: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: credentials.email,
        password: credentials.password
      })
    });
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });

  if (error) {
    throw mapSupabaseError(error, "登录失败，请稍后再试。");
  }

  return { message: "登录成功" };
}

export async function adminLogout(): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    await legacyRequest<void>("/api/admin/logout", { method: "POST" });
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw mapSupabaseError(error, "退出登录失败。");
  }
}

export async function getAdminMe(): Promise<{ authenticated: boolean; username?: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<{ authenticated: boolean; username?: string }>("/api/admin/me", {}, () => ({ authenticated: false }));
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw mapSupabaseError(error, "读取登录状态失败。");
  }

  const user = data.session?.user;
  if (!user) {
    return { authenticated: false };
  }

  const username = typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
    ? user.user_metadata.display_name.trim()
    : user.email?.split("@")[0] ?? user.email ?? "管理员";

  return {
    authenticated: true,
    username
  };
}

export async function getAdminMessages(): Promise<Message[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<Message[]>("/api/admin/messages", {}, () => []);
  }

  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
  if (error) {
    throw mapSupabaseError(error, "读取私信失败。");
  }

  return (data ?? []).map((row) => mapMessageRowToMessage(row as MessageRow));
}

export async function getAdminReviews(): Promise<Review[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<Review[]>("/api/admin/reviews", {}, () => []);
  }

  const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) {
    throw mapSupabaseError(error, "读取评论失败。");
  }

  return (data ?? []).map((row) => mapReviewRowToReview(row as ReviewRow));
}

export async function getAdminWorks(): Promise<Work[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<Work[]>("/api/admin/works", {}, () => sampleWorks);
  }

  const { data, error } = await supabase.from("works").select("*").order("updated_at", { ascending: false });
  if (error) {
    throw mapSupabaseError(error, "读取作品失败。");
  }

  return (data ?? []).map((row) => mapWorkRowToWork(row as WorkRow));
}

export async function createAdminWork(payload: Partial<Work>): Promise<Work> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<Work>("/api/admin/works", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  const work = createWorkFromPayload(payload);
  const { data, error } = await supabase.from("works").upsert(toWorkRow(work), { onConflict: "id" }).select("*").single();
  if (error) {
    throw mapSupabaseError(error, "创建作品失败。");
  }

  return mapWorkRowToWork(data as WorkRow);
}

export async function updateAdminWork(workId: string, payload: Partial<Work>): Promise<Work> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<Work>(`/api/admin/works/${workId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  const { data, error } = await supabase.from("works").update(toWorkPatch(payload)).eq("id", workId).select("*").single();
  if (error) {
    throw mapSupabaseError(error, "更新作品失败。");
  }

  return mapWorkRowToWork(data as WorkRow);
}

export async function deleteAdminWork(workId: string): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    await legacyRequest<void>(`/api/admin/works/${workId}`, { method: "DELETE" });
    return;
  }

  const { error } = await supabase.from("works").delete().eq("id", workId);
  if (error) {
    throw mapSupabaseError(error, "删除作品失败。");
  }
}

export async function getAdminPages(): Promise<PageContent[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const pages = await legacyRequest<PageContent[]>("/api/admin/pages", {}, () => samplePages);
    return mergePagesWithSamples(pages);
  }

  const { data, error } = await supabase.from("pages").select("*").order("slug", { ascending: true });
  if (error) {
    throw mapSupabaseError(error, "读取页面内容失败。");
  }

  return mergePagesWithSamples((data ?? []).map((row) => mapPageRowToPage(row as PageRow)));
}

export async function updateAdminPage(slug: string, payload: Partial<PageContent>): Promise<PageContent> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<PageContent>(`/api/admin/pages/${slug}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  const { data: existing } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
  const fallback = getSamplePage(slug);
  const merged: PageContent = {
    slug,
    title: payload.title ?? (existing?.title as string | undefined) ?? fallback.title,
    hero: payload.hero ?? (existing?.hero as string | undefined) ?? fallback.hero,
    body: payload.body ?? (existing?.body as string | undefined) ?? fallback.body,
    highlights: payload.highlights ?? normalizeStringArray(existing?.highlights) ?? fallback.highlights,
    updatedAt: nowIso()
  };

  const { data, error } = await supabase.from("pages").upsert(toPageRow(merged), { onConflict: "slug" }).select("*").single();
  if (error) {
    throw mapSupabaseError(error, "保存页面内容失败。");
  }

  return mapPageRowToPage(data as PageRow);
}

export async function getAdminSiteSettings(): Promise<SiteSettings> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<SiteSettings>("/api/admin/site-settings", {}, () => createHydrationSafeSiteSettings());
  }

  const { data, error } = await supabase.from("site_settings").select("*").eq("id", DEFAULT_SETTINGS_ID).maybeSingle();
  if (error) {
    throw mapSupabaseError(error, "读取站点设置失败。");
  }

  return data ? mapSiteSettingsRowToSettings(data as SiteSettingsRow) : createHydrationSafeSiteSettings();
}

export async function updateAdminSiteSettings(payload: SiteSettings): Promise<SiteSettings> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyRequest<SiteSettings>("/api/admin/site-settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  const { data, error } = await supabase.from("site_settings").upsert(toSiteSettingsRow(payload), { onConflict: "id" }).select("*").single();
  if (error) {
    throw mapSupabaseError(error, "保存站点设置失败。");
  }

  const settings = mapSiteSettingsRowToSettings(data as SiteSettingsRow);
  writeCachedSiteSettings(settings);
  return settings;
}

export async function uploadAdminAsset(file: File, slot: string): Promise<{ url: string; fileName: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return legacyUploadAdminAsset(file, slot);
  }

  ensureUploadWithinLimit(file);
  const objectPath = buildStoragePath(file, slot);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined
  });

  if (error) {
    throw mapSupabaseError(error, "上传媒体失败。");
  }

  const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
  return {
    url: publicData.publicUrl,
    fileName: file.name
  };
}

export { ApiError };

