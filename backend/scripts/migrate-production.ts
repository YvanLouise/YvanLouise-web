import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { inferMimeType, isSupportedMediaFile } from "../src/lib/uploads.js";
import { createDefaultPages, createDefaultSettings, createDefaultWorks, defaultSiteUiText } from "../src/store/defaultContent.js";
import {
  Message,
  MusicPreviewClip,
  PageContent,
  Review,
  SiteSettings,
  SiteUiText,
  SocialLink,
  Work,
  WorkDetailSection,
  WorkType
} from "../src/store/types.js";

interface LocalStoreState {
  works?: Work[];
  reviews?: Review[];
  messages?: Message[];
  pages?: PageContent[];
  settings?: SiteSettings;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultNow = new Date().toISOString();
const defaultWorks = createDefaultWorks(defaultNow);
const defaultPages = createDefaultPages(defaultNow);
const defaultSettings = createDefaultSettings(defaultNow);
const defaultWorkMap = new Map(defaultWorks.map((work) => [work.id, work]));
const defaultPageMap = new Map(defaultPages.map((page) => [page.slug, page]));
const localStorePath = process.env.LOCAL_STORE_PATH?.trim() || path.resolve(__dirname, "../data/local-store.json");
const localUploadsDir = process.env.LOCAL_UPLOADS_DIR?.trim() || path.resolve(__dirname, "../uploads");
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const storageBucket = process.env.SUPABASE_MEDIA_BUCKET?.trim() || "site-media";

function sanitizeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (!cleaned || cleaned.includes("�")) {
    return fallback;
  }

  return cleaned;
}

function sanitizeOptionalString(value: unknown, fallback?: string): string | undefined {
  const cleaned = sanitizeString(value, fallback ?? "");
  return cleaned || fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.map((item) => sanitizeString(item, "")).filter(Boolean);
  return normalized.length ? normalized : fallback;
}

function sanitizeDetailSections(value: unknown, fallback: WorkDetailSection[] = []): WorkDetailSection[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<WorkDetailSection>;
      const title = sanitizeString(record.title, "");
      const body = sanitizeString(record.body, "");
      if (!title || !body) {
        return null;
      }

      return { title, body };
    })
    .filter((item): item is WorkDetailSection => Boolean(item));

  return normalized.length ? normalized : fallback;
}

function sanitizeSocialLinks(value: unknown, fallback: SocialLink[] = []): SocialLink[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<SocialLink>;
      const label = sanitizeString(record.label, "");
      const url = sanitizeString(record.url, "");
      if (!label || !url) {
        return null;
      }

      return { label, url };
    })
    .filter((item): item is SocialLink => Boolean(item));

  return normalized.length ? normalized : fallback;
}

function sanitizeMusicPreviewClips(value: unknown): MusicPreviewClip[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<MusicPreviewClip>;
      const id = sanitizeString(record.id, "");
      const label = sanitizeString(record.label, "");
      const sourceUrl = sanitizeString(record.sourceUrl, "");
      const sourceName = sanitizeString(record.sourceName, "");
      const startTime = Number(record.startTime ?? 0);
      const endTime = Number(record.endTime ?? 0);

      if (!id || !label || !sourceUrl || !sourceName || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        return null;
      }

      return { id, label, sourceUrl, sourceName, startTime, endTime };
    })
    .filter((item): item is MusicPreviewClip => Boolean(item));
}

function mergeUiText(value: unknown): SiteUiText {
  const raw = typeof value === "object" && value !== null ? (value as Partial<SiteUiText>) : undefined;

  return {
    nav: { ...defaultSiteUiText.nav, ...(raw?.nav ?? {}) },
    footer: { ...defaultSiteUiText.footer, ...(raw?.footer ?? {}) },
    pageBadges: { ...defaultSiteUiText.pageBadges, ...(raw?.pageBadges ?? {}) },
    home: { ...defaultSiteUiText.home, ...(raw?.home ?? {}) },
    works: { ...defaultSiteUiText.works, ...(raw?.works ?? {}) },
    workDetail: { ...defaultSiteUiText.workDetail, ...(raw?.workDetail ?? {}) },
    contact: { ...defaultSiteUiText.contact, ...(raw?.contact ?? {}) },
    review: { ...defaultSiteUiText.review, ...(raw?.review ?? {}) },
    commission: {
      ...defaultSiteUiText.commission,
      ...(raw?.commission ?? {}),
      processSteps: Array.isArray(raw?.commission?.processSteps)
        ? raw.commission.processSteps.map((item) => sanitizeString(item, "")).filter(Boolean)
        : defaultSiteUiText.commission.processSteps
    },
    support: {
      ...defaultSiteUiText.support,
      ...(raw?.support ?? {}),
      methodNotes: Array.isArray(raw?.support?.methodNotes)
        ? raw.support.methodNotes.map((item) => sanitizeString(item, "")).filter(Boolean)
        : defaultSiteUiText.support.methodNotes
    },
    notFound: { ...defaultSiteUiText.notFound, ...(raw?.notFound ?? {}) }
  };
}

function normalizeWorkType(value: unknown, fallback: WorkType): WorkType {
  return value === "music" || value === "software" || value === "game" || value === "animation" ? value : fallback;
}

function normalizeWorks(value: unknown): Work[] {
  if (!Array.isArray(value) || !value.length) {
    return defaultWorks;
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<Work>;
      const fallback = (record.id && defaultWorkMap.get(record.id)) || defaultWorks[index] || defaultWorks[0];
      const id = sanitizeString(record.id, fallback.id);

      return {
        id,
        title: sanitizeString(record.title, fallback.title),
        type: normalizeWorkType(record.type, fallback.type),
        summary: sanitizeString(record.summary, fallback.summary),
        detailIntro: sanitizeString(record.detailIntro, fallback.detailIntro),
        background: sanitizeString(record.background, fallback.background),
        process: sanitizeString(record.process, fallback.process),
        result: sanitizeString(record.result, fallback.result),
        featureList: sanitizeStringArray(record.featureList, fallback.featureList),
        interactionPoints: sanitizeStringArray(record.interactionPoints, fallback.interactionPoints),
        galleryImages: sanitizeStringArray(record.galleryImages, fallback.galleryImages),
        detailSections: sanitizeDetailSections(record.detailSections, fallback.detailSections),
        platform: sanitizeOptionalString(record.platform, fallback.platform),
        status: sanitizeOptionalString(record.status, fallback.status),
        coverUrl: sanitizeString(record.coverUrl, fallback.coverUrl),
        demoUrl: sanitizeOptionalString(record.demoUrl, fallback.demoUrl),
        repoUrl: sanitizeOptionalString(record.repoUrl, fallback.repoUrl),
        publishedAt: sanitizeString(record.publishedAt, fallback.publishedAt),
        createdAt: sanitizeString(record.createdAt, defaultNow),
        updatedAt: sanitizeString(record.updatedAt, defaultNow)
      };
    })
    .filter((item): item is Work => Boolean(item));
}

function normalizePages(value: unknown): PageContent[] {
  const pageMap = new Map<string, PageContent>(defaultPages.map((page) => [page.slug, { ...page }]));

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const record = item as Partial<PageContent>;
      const slug = sanitizeString(record.slug, "");
      if (!slug) {
        return;
      }

      const fallback = defaultPageMap.get(slug) ?? {
        slug,
        title: slug,
        hero: "",
        body: "",
        highlights: [],
        updatedAt: defaultNow
      };

      pageMap.set(slug, {
        slug,
        title: sanitizeString(record.title, fallback.title),
        hero: sanitizeString(record.hero, fallback.hero),
        body: sanitizeString(record.body, fallback.body),
        highlights: sanitizeStringArray(record.highlights, fallback.highlights),
        updatedAt: sanitizeString(record.updatedAt, fallback.updatedAt)
      });
    });
  }

  return Array.from(pageMap.values());
}

function normalizeReviews(value: unknown): Review[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<Review>;
      const id = sanitizeString(record.id, "");
      const workId = sanitizeString(record.workId, "");
      const comment = sanitizeString(record.comment, "");
      const createdAt = sanitizeString(record.createdAt, defaultNow);
      const rating = Number(record.rating ?? 0);

      if (!id || !workId || !comment || !Number.isFinite(rating)) {
        return null;
      }

      return {
        id,
        workId,
        rating,
        comment,
        visitorName: sanitizeOptionalString(record.visitorName),
        ownerOnly: record.ownerOnly !== false,
        createdAt
      };
    })
    .filter((item): item is Review => Boolean(item));
}

function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<Message>;
      const id = sanitizeString(record.id, "");
      const name = sanitizeString(record.name, "");
      const contact = sanitizeString(record.contact, "");
      const subject = sanitizeString(record.subject, "");
      const body = sanitizeString(record.body, "");
      const createdAt = sanitizeString(record.createdAt, defaultNow);
      const status = record.status === "read" || record.status === "archived" ? record.status : "new";

      if (!id || !name || !contact || !subject || !body) {
        return null;
      }

      return { id, name, contact, subject, body, createdAt, status };
    })
    .filter((item): item is Message => Boolean(item));
}

function normalizeSettings(value: unknown, works: Work[]): SiteSettings {
  const record = value && typeof value === "object" ? (value as Partial<SiteSettings>) : {};
  const featuredWorkIds = Array.isArray(record.featuredWorkIds)
    ? record.featuredWorkIds.map((item) => sanitizeString(item, "")).filter(Boolean)
    : defaultSettings.featuredWorkIds;
  const allowedWorkIds = new Set(works.map((work) => work.id));
  const normalizedFeaturedIds = featuredWorkIds.filter((id, index, array) => allowedWorkIds.has(id) && array.indexOf(id) === index).slice(0, 6);

  return {
    siteTitle: sanitizeString(record.siteTitle, defaultSettings.siteTitle),
    tagline: sanitizeString(record.tagline, defaultSettings.tagline),
    primaryCtaLabel: sanitizeString(record.primaryCtaLabel, defaultSettings.primaryCtaLabel),
    primaryCtaHref: sanitizeString(record.primaryCtaHref, defaultSettings.primaryCtaHref),
    secondaryCtaLabel: sanitizeString(record.secondaryCtaLabel, defaultSettings.secondaryCtaLabel),
    secondaryCtaHref: sanitizeString(record.secondaryCtaHref, defaultSettings.secondaryCtaHref),
    bannerBadge: sanitizeString(record.bannerBadge, defaultSettings.bannerBadge),
    bannerHeadline: sanitizeString(record.bannerHeadline, defaultSettings.bannerHeadline),
    bannerDescription: sanitizeString(record.bannerDescription, defaultSettings.bannerDescription),
    bannerImageUrl: sanitizeString(record.bannerImageUrl, defaultSettings.bannerImageUrl),
    avatarImageUrl: sanitizeString(record.avatarImageUrl, defaultSettings.avatarImageUrl),
    afdianUrl: sanitizeString(record.afdianUrl, defaultSettings.afdianUrl),
    socialLinks: sanitizeSocialLinks(record.socialLinks, defaultSettings.socialLinks),
    musicPreviewClips: sanitizeMusicPreviewClips(record.musicPreviewClips),
    featuredWorkIds: normalizedFeaturedIds.length ? normalizedFeaturedIds : works.slice(0, 3).map((work) => work.id),
    uiText: mergeUiText(record.uiText),
    updatedAt: sanitizeString(record.updatedAt, defaultNow)
  };
}

function resolveLocalUploadFileName(url: string): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith("/uploads/")) {
    return decodeURIComponent(url.slice("/uploads/".length));
  }

  try {
    const parsed = new URL(url);
    const marker = "/uploads/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function collectReferencedLocalFiles(state: { works: Work[]; settings: SiteSettings }): Set<string> {
  const fileNames = new Set<string>();

  const pushIfLocal = (url: string | undefined) => {
    if (!url) {
      return;
    }

    const fileName = resolveLocalUploadFileName(url);
    if (fileName) {
      fileNames.add(fileName);
    }
  };

  pushIfLocal(state.settings.bannerImageUrl);
  pushIfLocal(state.settings.avatarImageUrl);
  state.settings.musicPreviewClips.forEach((clip) => pushIfLocal(clip.sourceUrl));

  state.works.forEach((work) => {
    pushIfLocal(work.coverUrl);
    work.galleryImages.forEach((imageUrl) => pushIfLocal(imageUrl));
  });

  return fileNames;
}

function rewriteLocalUrl(url: string | undefined, uploadedMediaMap: Map<string, string>): string | undefined {
  if (!url) {
    return url;
  }

  const fileName = resolveLocalUploadFileName(url);
  if (!fileName) {
    return url;
  }

  const rewrittenUrl = uploadedMediaMap.get(fileName);
  if (!rewrittenUrl) {
    throw new Error(`缺少已上传媒体映射：${fileName}`);
  }

  return rewrittenUrl;
}

async function readLocalStore(): Promise<LocalStoreState> {
  const raw = await fs.readFile(localStorePath, "utf8");
  return JSON.parse(raw) as LocalStoreState;
}

async function readLocalUploadFiles(): Promise<string[]> {
  const entries = await fs.readdir(localUploadsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName !== ".gitkeep" && isSupportedMediaFile(fileName));
}

async function ensureMediaBucket(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`读取 Supabase Storage bucket 失败：${error.message}`);
  }

  const exists = (buckets ?? []).some((bucket) => bucket.id === storageBucket || bucket.name === storageBucket);
  if (exists) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(storageBucket, {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/svg+xml",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/flac"
    ]
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`创建 Supabase Storage bucket 失败：${createError.message}`);
  }
}

async function uploadLocalMediaToSupabase(fileNames: string[], supabase: ReturnType<typeof createClient>): Promise<Map<string, string>> {
  const uploadedMediaMap = new Map<string, string>();

  for (const fileName of fileNames) {
    const filePath = path.join(localUploadsDir, fileName);
    const buffer = await fs.readFile(filePath);
    const mimeType = inferMimeType(fileName);
    const objectPath = `migrated/${fileName}`;
    const payload = new Blob([buffer], { type: mimeType });

    const { error } = await supabase.storage.from(storageBucket).upload(objectPath, payload, {
      contentType: mimeType,
      upsert: true
    });

    if (error) {
      throw new Error(`上传媒体失败：${fileName} -> ${error.message}`);
    }

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(objectPath);
    uploadedMediaMap.set(fileName, data.publicUrl);
  }

  return uploadedMediaMap;
}

function buildPreparedState(rawState: LocalStoreState, uploadedMediaMap: Map<string, string>) {
  const works = normalizeWorks(rawState.works).map((work) => ({
    ...work,
    coverUrl: rewriteLocalUrl(work.coverUrl, uploadedMediaMap) ?? work.coverUrl,
    galleryImages: work.galleryImages.map((imageUrl) => rewriteLocalUrl(imageUrl, uploadedMediaMap) ?? imageUrl)
  }));
  const settings = normalizeSettings(rawState.settings, works);

  return {
    works,
    reviews: normalizeReviews(rawState.reviews),
    messages: normalizeMessages(rawState.messages),
    pages: normalizePages(rawState.pages),
    settings: {
      ...settings,
      bannerImageUrl: rewriteLocalUrl(settings.bannerImageUrl, uploadedMediaMap) ?? settings.bannerImageUrl,
      avatarImageUrl: rewriteLocalUrl(settings.avatarImageUrl, uploadedMediaMap) ?? settings.avatarImageUrl,
      musicPreviewClips: settings.musicPreviewClips.map((clip) => ({
        ...clip,
        sourceUrl: rewriteLocalUrl(clip.sourceUrl, uploadedMediaMap) ?? clip.sourceUrl
      }))
    }
  };
}

function toWorkRow(work: Work) {
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
    created_at: work.createdAt,
    updated_at: work.updatedAt
  };
}

function toReviewRow(review: Review) {
  return {
    id: review.id,
    work_id: review.workId,
    rating: review.rating,
    comment: review.comment,
    visitor_name: review.visitorName ?? null,
    owner_only: review.ownerOnly,
    created_at: review.createdAt
  };
}

function toMessageRow(message: Message) {
  return {
    id: message.id,
    name: message.name,
    contact: message.contact,
    subject: message.subject,
    body: message.body,
    status: message.status,
    created_at: message.createdAt
  };
}

function toPageRow(page: PageContent) {
  return {
    slug: page.slug,
    title: page.title,
    hero: page.hero,
    body: page.body,
    highlights: page.highlights,
    updated_at: page.updatedAt
  };
}

function toSiteSettingsRow(settings: SiteSettings) {
  return {
    id: "default",
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
    updated_at: settings.updatedAt
  };
}

function assertMigrationConfig(): void {
  const missing: string[] = [];

  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }
  if (!supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length) {
    throw new Error(`迁移所需环境变量不完整：${missing.join(", ")}`);
  }
}

async function upsertRows(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Array<Record<string, unknown>>,
  onConflict: string
): Promise<void> {
  if (!rows.length) {
    return;
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(`写入 ${table} 失败：${error.message}`);
  }
}

async function main(): Promise<void> {
  assertMigrationConfig();

  const supabase = createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  await ensureMediaBucket(supabase);

  const rawState = await readLocalStore();
  const previewWorks = normalizeWorks(rawState.works);
  const previewSettings = normalizeSettings(rawState.settings, previewWorks);
  const referencedLocalFiles = collectReferencedLocalFiles({ works: previewWorks, settings: previewSettings });
  const existingLocalFiles = await readLocalUploadFiles();
  const missingFiles = Array.from(referencedLocalFiles).filter((fileName) => !existingLocalFiles.includes(fileName));

  if (missingFiles.length) {
    throw new Error(`以下本地媒体文件缺失，迁移已终止：${missingFiles.join(", ")}`);
  }

  const uploadedMediaMap = await uploadLocalMediaToSupabase(Array.from(referencedLocalFiles), supabase);
  const preparedState = buildPreparedState(rawState, uploadedMediaMap);

  await upsertRows(supabase, "works", preparedState.works.map(toWorkRow), "id");
  await upsertRows(supabase, "reviews", preparedState.reviews.map(toReviewRow), "id");
  await upsertRows(supabase, "messages", preparedState.messages.map(toMessageRow), "id");
  await upsertRows(supabase, "pages", preparedState.pages.map(toPageRow), "slug");
  await upsertRows(supabase, "site_settings", [toSiteSettingsRow(preparedState.settings)], "id");

  console.log(
    JSON.stringify(
      {
        ok: true,
        works: preparedState.works.length,
        reviews: preparedState.reviews.length,
        messages: preparedState.messages.length,
        pages: preparedState.pages.length,
        uploadedMedia: uploadedMediaMap.size,
        featuredWorkIds: preparedState.settings.featuredWorkIds,
        mediaBucket: storageBucket
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
