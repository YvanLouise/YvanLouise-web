import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { config } from "../config.js";
import { createDefaultPages, createDefaultSettings, createDefaultWorks, defaultSiteUiText } from "./defaultContent.js";
import {
  AdminUser,
  Message,
  MusicPreviewClip,
  PageContent,
  Review,
  SiteSettings,
  SiteStore,
  SiteUiText,
  SocialLink,
  Work,
  WorkDetailSection,
  WorkType
} from "./types.js";

interface PersistedState {
  works: Work[];
  reviews: Review[];
  messages: Message[];
  pages: PageContent[];
  settings: SiteSettings;
}

const storeFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/local-store.json");

function nowIso(): string {
  return new Date().toISOString();
}

function cloneSocialLinks(links: SocialLink[]): SocialLink[] {
  return links.map((link) => ({ ...link }));
}

function cloneMusicPreviewClips(clips: MusicPreviewClip[]): MusicPreviewClip[] {
  return clips.map((clip) => ({ ...clip }));
}

function cloneDetailSections(sections: WorkDetailSection[]): WorkDetailSection[] {
  return sections.map((section) => ({ ...section }));
}

function cloneUiText(uiText: SiteUiText): SiteUiText {
  return JSON.parse(JSON.stringify(uiText)) as SiteUiText;
}

function cloneWork(work: Work): Work {
  return {
    ...work,
    featureList: [...work.featureList],
    interactionPoints: [...work.interactionPoints],
    galleryImages: [...work.galleryImages],
    detailSections: cloneDetailSections(work.detailSections)
  };
}

function cloneReview(review: Review): Review {
  return { ...review };
}

function cloneMessage(message: Message): Message {
  return { ...message };
}

function clonePage(page: PageContent): PageContent {
  return {
    ...page,
    highlights: [...page.highlights]
  };
}

function cloneSettings(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    socialLinks: cloneSocialLinks(settings.socialLinks),
    musicPreviewClips: cloneMusicPreviewClips(settings.musicPreviewClips),
    featuredWorkIds: [...settings.featuredWorkIds],
    uiText: cloneUiText(settings.uiText)
  };
}

function createSeedWorks(): Work[] {
  return createDefaultWorks(nowIso());
}

function createSeedPages(): PageContent[] {
  return createDefaultPages(nowIso());
}

function createSeedSettings(): SiteSettings {
  return createDefaultSettings(nowIso());
}

function createDefaultState(): PersistedState {
  return {
    works: createSeedWorks(),
    reviews: [],
    messages: [],
    pages: createSeedPages(),
    settings: createSeedSettings()
  };
}

function ensureStoreDir(): void {
  fs.mkdirSync(path.dirname(storeFilePath), { recursive: true });
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function normalizeDetailSections(value: unknown, fallback: WorkDetailSection[] = []): WorkDetailSection[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const title = String((item as { title?: unknown }).title ?? "").trim();
      const body = String((item as { body?: unknown }).body ?? "").trim();
      if (!title || !body) {
        return null;
      }

      return { title, body };
    })
    .filter((item): item is WorkDetailSection => item !== null);
}

function normalizeMusicPreviewClips(value: unknown): MusicPreviewClip[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const id = String((item as { id?: unknown }).id ?? "").trim();
      const label = String((item as { label?: unknown }).label ?? "").trim();
      const sourceUrl = String((item as { sourceUrl?: unknown }).sourceUrl ?? "").trim();
      const sourceName = String((item as { sourceName?: unknown }).sourceName ?? "").trim();
      const startTime = Number((item as { startTime?: unknown }).startTime ?? 0);
      const endTime = Number((item as { endTime?: unknown }).endTime ?? 0);

      if (!id || !label || !sourceUrl || !sourceName || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        return null;
      }

      return { id, label, sourceUrl, sourceName, startTime, endTime };
    })
    .filter((item): item is MusicPreviewClip => item !== null);
}

function normalizeFeaturedWorkIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function mergeUiText(value: Partial<SiteUiText> | undefined): SiteUiText {
  return {
    nav: { ...defaultSiteUiText.nav, ...(value?.nav ?? {}) },
    footer: { ...defaultSiteUiText.footer, ...(value?.footer ?? {}) },
    pageBadges: { ...defaultSiteUiText.pageBadges, ...(value?.pageBadges ?? {}) },
    home: { ...defaultSiteUiText.home, ...(value?.home ?? {}) },
    works: { ...defaultSiteUiText.works, ...(value?.works ?? {}) },
    workDetail: { ...defaultSiteUiText.workDetail, ...(value?.workDetail ?? {}) },
    contact: { ...defaultSiteUiText.contact, ...(value?.contact ?? {}) },
    review: { ...defaultSiteUiText.review, ...(value?.review ?? {}) },
    commission: {
      ...defaultSiteUiText.commission,
      ...(value?.commission ?? {}),
      processSteps: Array.isArray(value?.commission?.processSteps)
        ? value.commission.processSteps.map((item) => String(item)).filter(Boolean)
        : defaultSiteUiText.commission.processSteps
    },
    support: {
      ...defaultSiteUiText.support,
      ...(value?.support ?? {}),
      methodNotes: Array.isArray(value?.support?.methodNotes)
        ? value.support.methodNotes.map((item) => String(item)).filter(Boolean)
        : defaultSiteUiText.support.methodNotes
    },
    notFound: { ...defaultSiteUiText.notFound, ...(value?.notFound ?? {}) }
  };
}

function mergePages(storedPages: PageContent[] | undefined): PageContent[] {
  const defaults = createSeedPages();
  const pageMap = new Map<string, PageContent>();

  defaults.forEach((page) => {
    pageMap.set(page.slug, clonePage(page));
  });

  if (Array.isArray(storedPages)) {
    storedPages.forEach((page) => {
      if (!page || typeof page !== "object") {
        return;
      }

      const slug = typeof page.slug === "string" ? page.slug : "";
      if (!slug) {
        return;
      }

      const base = pageMap.get(slug);
      pageMap.set(slug, {
        slug,
        title: typeof page.title === "string" ? page.title : base?.title ?? "",
        hero: typeof page.hero === "string" ? page.hero : base?.hero ?? "",
        body: typeof page.body === "string" ? page.body : base?.body ?? "",
        highlights: Array.isArray(page.highlights) ? page.highlights.map((item) => String(item)) : base?.highlights ?? [],
        updatedAt: typeof page.updatedAt === "string" ? page.updatedAt : base?.updatedAt ?? nowIso()
      });
    });
  }

  return Array.from(pageMap.values()).map(clonePage);
}

function mergeSettings(storedSettings: Partial<SiteSettings> | undefined): SiteSettings {
  const defaults = createSeedSettings();
  const mergedLinks = Array.isArray(storedSettings?.socialLinks)
    ? storedSettings.socialLinks
        .map((link) => ({
          label: String(link?.label ?? "").trim(),
          url: String(link?.url ?? "").trim()
        }))
        .filter((link) => link.label && link.url)
    : defaults.socialLinks;

  return cloneSettings({
    ...defaults,
    ...storedSettings,
    bannerBadge: typeof storedSettings?.bannerBadge === "string" ? storedSettings.bannerBadge : defaults.bannerBadge,
    bannerHeadline: typeof storedSettings?.bannerHeadline === "string" ? storedSettings.bannerHeadline : defaults.bannerHeadline,
    bannerDescription: typeof storedSettings?.bannerDescription === "string" ? storedSettings.bannerDescription : defaults.bannerDescription,
    bannerImageUrl: typeof storedSettings?.bannerImageUrl === "string" ? storedSettings.bannerImageUrl : defaults.bannerImageUrl,
    avatarImageUrl: typeof storedSettings?.avatarImageUrl === "string" ? storedSettings.avatarImageUrl : defaults.avatarImageUrl,
    afdianUrl: typeof storedSettings?.afdianUrl === "string" ? storedSettings.afdianUrl : defaults.afdianUrl,
    socialLinks: mergedLinks,
    musicPreviewClips: normalizeMusicPreviewClips(storedSettings?.musicPreviewClips),
    featuredWorkIds: (() => {
      const normalized = normalizeFeaturedWorkIds(storedSettings?.featuredWorkIds);
      return normalized.length ? normalized : defaults.featuredWorkIds;
    })(),
    uiText: mergeUiText(storedSettings?.uiText),
    updatedAt: typeof storedSettings?.updatedAt === "string" ? storedSettings.updatedAt : defaults.updatedAt
  });
}

function mergeWorks(storedWorks: Work[] | undefined): Work[] {
  const defaults = createSeedWorks();
  if (!Array.isArray(storedWorks)) {
    return defaults.map(cloneWork);
  }

  return storedWorks.map((work) => {
    const base = defaults.find((item) => item.id === work.id);
    return {
      ...(base ?? {}),
      ...work,
      detailIntro: typeof work.detailIntro === "string" ? work.detailIntro : base?.detailIntro ?? "",
      featureList: normalizeStringList(work.featureList ?? base?.featureList),
      interactionPoints: normalizeStringList(work.interactionPoints ?? base?.interactionPoints),
      galleryImages: normalizeStringList(work.galleryImages ?? base?.galleryImages),
      detailSections: normalizeDetailSections(work.detailSections, base?.detailSections ?? []),
      platform: typeof work.platform === "string" ? work.platform : base?.platform,
      status: typeof work.status === "string" ? work.status : base?.status
    } as Work;
  });
}

function readPersistedState(): PersistedState | null {
  ensureStoreDir();

  if (!fs.existsSync(storeFilePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(storeFilePath, "utf8")) as Partial<PersistedState>;

    return {
      works: mergeWorks(parsed.works),
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews.map((review) => ({ ...review })) : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages.map((message) => ({ ...message })) : [],
      pages: mergePages(parsed.pages),
      settings: mergeSettings(parsed.settings)
    };
  } catch (error) {
    console.warn("Failed to read local store, falling back to defaults.", error);
    return null;
  }
}

export class MemorySiteStore implements SiteStore {
  private works: Work[];
  private reviews: Review[];
  private messages: Message[];
  private pages: PageContent[];
  private settings: SiteSettings;
  private admin: AdminUser;

  constructor() {
    const persisted = readPersistedState() ?? createDefaultState();

    this.works = persisted.works.map(cloneWork);
    this.reviews = persisted.reviews.map(cloneReview);
    this.messages = persisted.messages.map(cloneMessage);
    this.pages = persisted.pages.map(clonePage);
    this.settings = cloneSettings(persisted.settings);
    this.admin = {
      id: randomUUID(),
      username: config.adminUsername,
      passwordHash: bcrypt.hashSync(config.adminPassword, 10),
      createdAt: nowIso()
    };

    this.persistState();
  }

  private persistState(): void {
    ensureStoreDir();
    const payload: PersistedState = {
      works: this.works.map(cloneWork),
      reviews: this.reviews.map(cloneReview),
      messages: this.messages.map(cloneMessage),
      pages: this.pages.map(clonePage),
      settings: cloneSettings(this.settings)
    };

    fs.writeFileSync(storeFilePath, JSON.stringify(payload, null, 2), "utf8");
  }

  async getWorks(type?: WorkType): Promise<Work[]> {
    return (type ? this.works.filter((work) => work.type === type) : this.works).map(cloneWork);
  }

  async getWorkById(workId: string): Promise<Work | null> {
    const work = this.works.find((item) => item.id === workId);
    return work ? cloneWork(work) : null;
  }

  async createWork(payload: Partial<Work>): Promise<Work> {
    const timestamp = nowIso();
    const work: Work = {
      id: randomUUID(),
      title: payload.title ?? "未命名作品",
      type: (payload.type as WorkType | undefined) ?? "software",
      summary: payload.summary ?? "",
      detailIntro: payload.detailIntro ?? "",
      background: payload.background ?? "",
      process: payload.process ?? "",
      result: payload.result ?? "",
      featureList: payload.featureList ?? [],
      interactionPoints: payload.interactionPoints ?? [],
      galleryImages: payload.galleryImages ?? [],
      detailSections: payload.detailSections ?? [],
      platform: payload.platform,
      status: payload.status,
      coverUrl: payload.coverUrl ?? "",
      demoUrl: payload.demoUrl,
      repoUrl: payload.repoUrl,
      publishedAt: payload.publishedAt ?? timestamp.slice(0, 10),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.works = [work, ...this.works];
    this.persistState();
    return cloneWork(work);
  }

  async updateWork(workId: string, payload: Partial<Work>): Promise<Work | null> {
    const index = this.works.findIndex((item) => item.id === workId);
    if (index < 0) {
      return null;
    }

    const current = this.works[index];
    const updated: Work = {
      ...current,
      ...payload,
      featureList: payload.featureList ?? current.featureList,
      interactionPoints: payload.interactionPoints ?? current.interactionPoints,
      galleryImages: payload.galleryImages ?? current.galleryImages,
      detailSections: payload.detailSections ?? current.detailSections,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: nowIso()
    };

    this.works[index] = updated;
    this.persistState();
    return cloneWork(updated);
  }

  async deleteWork(workId: string): Promise<boolean> {
    const original = this.works.length;
    this.works = this.works.filter((work) => work.id !== workId);
    const deleted = this.works.length < original;

    if (deleted) {
      this.persistState();
    }

    return deleted;
  }

  async createReview(payload: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const review: Review = {
      ...payload,
      id: randomUUID(),
      createdAt: nowIso()
    };

    this.reviews = [review, ...this.reviews];
    this.persistState();
    return cloneReview(review);
  }

  async getReviews(): Promise<Review[]> {
    return this.reviews.map(cloneReview);
  }

  async createMessage(payload: Omit<Message, "id" | "status" | "createdAt">): Promise<Message> {
    const message: Message = {
      ...payload,
      id: randomUUID(),
      status: "new",
      createdAt: nowIso()
    };

    this.messages = [message, ...this.messages];
    this.persistState();
    return cloneMessage(message);
  }

  async getMessages(): Promise<Message[]> {
    return this.messages.map(cloneMessage);
  }

  async getPage(slug: string): Promise<PageContent | null> {
    const page = this.pages.find((item) => item.slug === slug);
    return page ? clonePage(page) : null;
  }

  async getPages(): Promise<PageContent[]> {
    return this.pages.map(clonePage);
  }

  async upsertPage(slug: string, payload: Partial<PageContent>): Promise<PageContent> {
    const existing = this.pages.find((page) => page.slug === slug);

    if (!existing) {
      const created: PageContent = {
        slug,
        title: payload.title ?? "",
        hero: payload.hero ?? "",
        body: payload.body ?? "",
        highlights: payload.highlights ?? [],
        updatedAt: nowIso()
      };

      this.pages = [created, ...this.pages];
      this.persistState();
      return clonePage(created);
    }

    const updated: PageContent = {
      ...existing,
      ...payload,
      slug,
      highlights: payload.highlights ?? existing.highlights,
      updatedAt: nowIso()
    };

    this.pages = this.pages.map((page) => (page.slug === slug ? updated : page));
    this.persistState();
    return clonePage(updated);
  }

  async getSiteSettings(): Promise<SiteSettings> {
    return cloneSettings(this.settings);
  }

  async updateSiteSettings(payload: SiteSettings): Promise<SiteSettings> {
    this.settings = {
      ...payload,
      socialLinks: cloneSocialLinks(payload.socialLinks),
      musicPreviewClips: cloneMusicPreviewClips(payload.musicPreviewClips),
      featuredWorkIds: [...payload.featuredWorkIds],
      uiText: cloneUiText(payload.uiText),
      updatedAt: nowIso()
    };

    this.persistState();
    return cloneSettings(this.settings);
  }

  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    return this.admin.username === username ? { ...this.admin } : null;
  }
}
