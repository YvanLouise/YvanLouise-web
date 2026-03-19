import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Pool } from "pg";
import { config } from "../config.js";
import { createDefaultSettings, defaultSiteUiText } from "./defaultContent.js";
import {
  AdminUser,
  Message,
  MusicPreviewClip,
  PageContent,
  Review,
  SiteSettings,
  SiteStore,
  SiteUiText,
  Work,
  WorkDetailSection,
  WorkType
} from "./types.js";

interface DbWorkRow {
  id: string;
  title: string;
  type: WorkType;
  summary: string;
  detail_intro: string;
  background: string;
  process: string;
  result: string;
  feature_list: string[];
  interaction_points: string[];
  gallery_images: unknown;
  detail_sections: unknown;
  platform: string;
  status: string;
  cover_url: string;
  demo_url: string | null;
  repo_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

interface DbReviewRow {
  id: string;
  work_id: string;
  rating: number;
  comment: string;
  visitor_name: string | null;
  owner_only: boolean;
  created_at: string;
}

interface DbMessageRow {
  id: string;
  name: string;
  contact: string;
  subject: string;
  body: string;
  status: "new" | "read" | "archived";
  created_at: string;
}

interface DbPageRow {
  slug: string;
  title: string;
  hero: string;
  body: string;
  highlights: string[];
  updated_at: string;
}

interface DbAdminRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

interface DbSettingsRow {
  site_title: string;
  tagline: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  banner_badge: string | null;
  banner_headline: string | null;
  banner_description: string | null;
  banner_image_url: string | null;
  avatar_image_url: string | null;
  afdian_url: string | null;
  social_links: unknown;
  music_preview_clips: unknown;
  featured_work_ids: unknown;
  ui_text: unknown;
  updated_at: string;
}

function parseStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function parseDetailSections(value: unknown): WorkDetailSection[] {
  if (!Array.isArray(value)) {
    return [];
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

function parseMusicPreviewClips(value: unknown): MusicPreviewClip[] {
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

function parseSocialLinks(value: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const label = String((item as { label?: unknown }).label ?? "").trim();
      const url = String((item as { url?: unknown }).url ?? "").trim();
      if (!label || !url) {
        return null;
      }

      return { label, url };
    })
    .filter((item): item is { label: string; url: string } => item !== null);
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
        ? raw.commission.processSteps.map((item) => String(item)).filter(Boolean)
        : defaultSiteUiText.commission.processSteps
    },
    support: {
      ...defaultSiteUiText.support,
      ...(raw?.support ?? {}),
      methodNotes: Array.isArray(raw?.support?.methodNotes)
        ? raw.support.methodNotes.map((item) => String(item)).filter(Boolean)
        : defaultSiteUiText.support.methodNotes
    },
    notFound: { ...defaultSiteUiText.notFound, ...(raw?.notFound ?? {}) }
  };
}

function mapWork(row: DbWorkRow): Work {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    summary: row.summary,
    detailIntro: row.detail_intro,
    background: row.background,
    process: row.process,
    result: row.result,
    featureList: row.feature_list ?? [],
    interactionPoints: row.interaction_points ?? [],
    galleryImages: parseStringList(row.gallery_images),
    detailSections: parseDetailSections(row.detail_sections),
    platform: row.platform || undefined,
    status: row.status || undefined,
    coverUrl: row.cover_url,
    demoUrl: row.demo_url ?? undefined,
    repoUrl: row.repo_url ?? undefined,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReview(row: DbReviewRow): Review {
  return {
    id: row.id,
    workId: row.work_id,
    rating: row.rating,
    comment: row.comment,
    visitorName: row.visitor_name ?? undefined,
    ownerOnly: row.owner_only,
    createdAt: row.created_at
  };
}

function mapMessage(row: DbMessageRow): Message {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapPage(row: DbPageRow): PageContent {
  return {
    slug: row.slug,
    title: row.title,
    hero: row.hero,
    body: row.body,
    highlights: row.highlights,
    updatedAt: row.updated_at
  };
}

function mapSettings(row: DbSettingsRow): SiteSettings {
  return {
    siteTitle: row.site_title,
    tagline: row.tagline,
    primaryCtaLabel: row.primary_cta_label,
    primaryCtaHref: row.primary_cta_href,
    secondaryCtaLabel: row.secondary_cta_label,
    secondaryCtaHref: row.secondary_cta_href,
    bannerBadge: row.banner_badge ?? "首页横幅",
    bannerHeadline: row.banner_headline ?? "",
    bannerDescription: row.banner_description ?? "",
    bannerImageUrl: row.banner_image_url ?? "",
    avatarImageUrl: row.avatar_image_url ?? "",
    afdianUrl: row.afdian_url ?? "",
    socialLinks: parseSocialLinks(row.social_links),
    musicPreviewClips: parseMusicPreviewClips(row.music_preview_clips),
    featuredWorkIds: parseStringList(row.featured_work_ids),
    uiText: mergeUiText(row.ui_text),
    updatedAt: row.updated_at
  };
}

export class PostgresSiteStore implements SiteStore {
  constructor(private readonly pool: Pool) {}

  async getWorks(type?: WorkType): Promise<Work[]> {
    const query = type
      ? {
          text: `
            SELECT id, title, type, summary, detail_intro, background, process, result, feature_list,
                   interaction_points, gallery_images, detail_sections, platform, status,
                   cover_url, demo_url, repo_url, published_at, created_at, updated_at
            FROM works
            WHERE type = $1
            ORDER BY published_at DESC, created_at DESC
          `,
          values: [type]
        }
      : {
          text: `
            SELECT id, title, type, summary, detail_intro, background, process, result, feature_list,
                   interaction_points, gallery_images, detail_sections, platform, status,
                   cover_url, demo_url, repo_url, published_at, created_at, updated_at
            FROM works
            ORDER BY published_at DESC, created_at DESC
          `,
          values: []
        };

    const result = await this.pool.query<DbWorkRow>(query.text, query.values);
    return result.rows.map(mapWork);
  }

  async getWorkById(workId: string): Promise<Work | null> {
    const result = await this.pool.query<DbWorkRow>(
      `
      SELECT id, title, type, summary, detail_intro, background, process, result, feature_list,
             interaction_points, gallery_images, detail_sections, platform, status,
             cover_url, demo_url, repo_url, published_at, created_at, updated_at
      FROM works
      WHERE id = $1
      LIMIT 1
    `,
      [workId]
    );

    return result.rows[0] ? mapWork(result.rows[0]) : null;
  }

  async createWork(payload: Partial<Work>): Promise<Work> {
    const id = randomUUID();
    const publishedAt = payload.publishedAt ?? new Date().toISOString().slice(0, 10);

    const result = await this.pool.query<DbWorkRow>(
      `
      INSERT INTO works (
        id, title, type, summary, detail_intro, background, process, result, feature_list,
        interaction_points, gallery_images, detail_sections, platform, status,
        cover_url, demo_url, repo_url, published_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17,$18)
      RETURNING id, title, type, summary, detail_intro, background, process, result, feature_list,
                interaction_points, gallery_images, detail_sections, platform, status,
                cover_url, demo_url, repo_url, published_at, created_at, updated_at
    `,
      [
        id,
        payload.title ?? "未命名作品",
        payload.type ?? "software",
        payload.summary ?? "",
        payload.detailIntro ?? "",
        payload.background ?? "",
        payload.process ?? "",
        payload.result ?? "",
        payload.featureList ?? [],
        payload.interactionPoints ?? [],
        JSON.stringify(payload.galleryImages ?? []),
        JSON.stringify(payload.detailSections ?? []),
        payload.platform ?? "",
        payload.status ?? "",
        payload.coverUrl ?? "",
        payload.demoUrl ?? null,
        payload.repoUrl ?? null,
        publishedAt
      ]
    );

    return mapWork(result.rows[0]);
  }

  async updateWork(workId: string, payload: Partial<Work>): Promise<Work | null> {
    const current = await this.getWorkById(workId);
    if (!current) {
      return null;
    }

    const result = await this.pool.query<DbWorkRow>(
      `
      UPDATE works
      SET
        title = $2,
        type = $3,
        summary = $4,
        detail_intro = $5,
        background = $6,
        process = $7,
        result = $8,
        feature_list = $9,
        interaction_points = $10,
        gallery_images = $11::jsonb,
        detail_sections = $12::jsonb,
        platform = $13,
        status = $14,
        cover_url = $15,
        demo_url = $16,
        repo_url = $17,
        published_at = $18,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, title, type, summary, detail_intro, background, process, result, feature_list,
                interaction_points, gallery_images, detail_sections, platform, status,
                cover_url, demo_url, repo_url, published_at, created_at, updated_at
    `,
      [
        workId,
        payload.title ?? current.title,
        payload.type ?? current.type,
        payload.summary ?? current.summary,
        payload.detailIntro ?? current.detailIntro,
        payload.background ?? current.background,
        payload.process ?? current.process,
        payload.result ?? current.result,
        payload.featureList ?? current.featureList,
        payload.interactionPoints ?? current.interactionPoints,
        JSON.stringify(payload.galleryImages ?? current.galleryImages),
        JSON.stringify(payload.detailSections ?? current.detailSections),
        payload.platform ?? current.platform ?? "",
        payload.status ?? current.status ?? "",
        payload.coverUrl ?? current.coverUrl,
        payload.demoUrl ?? current.demoUrl ?? null,
        payload.repoUrl ?? current.repoUrl ?? null,
        payload.publishedAt ?? current.publishedAt
      ]
    );

    return result.rows[0] ? mapWork(result.rows[0]) : null;
  }

  async deleteWork(workId: string): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM works WHERE id = $1", [workId]);
    return (result.rowCount ?? 0) > 0;
  }

  async createReview(payload: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const id = randomUUID();
    const result = await this.pool.query<DbReviewRow>(
      `
      INSERT INTO reviews (id, work_id, rating, comment, visitor_name, owner_only)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, work_id, rating, comment, visitor_name, owner_only, created_at
    `,
      [id, payload.workId, payload.rating, payload.comment, payload.visitorName ?? null, payload.ownerOnly]
    );

    return mapReview(result.rows[0]);
  }

  async getReviews(): Promise<Review[]> {
    const result = await this.pool.query<DbReviewRow>(
      `
      SELECT id, work_id, rating, comment, visitor_name, owner_only, created_at
      FROM reviews
      ORDER BY created_at DESC
    `
    );

    return result.rows.map(mapReview);
  }

  async createMessage(payload: Omit<Message, "id" | "status" | "createdAt">): Promise<Message> {
    const id = randomUUID();
    const result = await this.pool.query<DbMessageRow>(
      `
      INSERT INTO messages (id, name, contact, subject, body)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, name, contact, subject, body, status, created_at
    `,
      [id, payload.name, payload.contact, payload.subject, payload.body]
    );

    return mapMessage(result.rows[0]);
  }

  async getMessages(): Promise<Message[]> {
    const result = await this.pool.query<DbMessageRow>(
      `
      SELECT id, name, contact, subject, body, status, created_at
      FROM messages
      ORDER BY created_at DESC
    `
    );

    return result.rows.map(mapMessage);
  }

  async getPage(slug: string): Promise<PageContent | null> {
    const result = await this.pool.query<DbPageRow>(
      `
      SELECT slug, title, hero, body, highlights, updated_at
      FROM pages
      WHERE slug = $1
      LIMIT 1
    `,
      [slug]
    );

    return result.rows[0] ? mapPage(result.rows[0]) : null;
  }

  async getPages(): Promise<PageContent[]> {
    const result = await this.pool.query<DbPageRow>(
      `
      SELECT slug, title, hero, body, highlights, updated_at
      FROM pages
      ORDER BY slug ASC
    `
    );

    return result.rows.map(mapPage);
  }

  async upsertPage(slug: string, payload: Partial<PageContent>): Promise<PageContent> {
    const current = await this.getPage(slug);

    const result = await this.pool.query<DbPageRow>(
      `
      INSERT INTO pages (slug, title, hero, body, highlights)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (slug)
      DO UPDATE SET
        title = EXCLUDED.title,
        hero = EXCLUDED.hero,
        body = EXCLUDED.body,
        highlights = EXCLUDED.highlights,
        updated_at = NOW()
      RETURNING slug, title, hero, body, highlights, updated_at
    `,
      [
        slug,
        payload.title ?? current?.title ?? "",
        payload.hero ?? current?.hero ?? "",
        payload.body ?? current?.body ?? "",
        payload.highlights ?? current?.highlights ?? []
      ]
    );

    return mapPage(result.rows[0]);
  }

  async getSiteSettings(): Promise<SiteSettings> {
    const result = await this.pool.query<DbSettingsRow>(
      `
      SELECT site_title, tagline, primary_cta_label, primary_cta_href,
             secondary_cta_label, secondary_cta_href,
             banner_badge, banner_headline, banner_description,
             banner_image_url, avatar_image_url, afdian_url,
             social_links, music_preview_clips, featured_work_ids, ui_text, updated_at
      FROM site_settings
      WHERE id = 'default'
      LIMIT 1
    `
    );

    if (!result.rows[0]) {
      return createDefaultSettings(new Date().toISOString());
    }

    return mapSettings(result.rows[0]);
  }

  async updateSiteSettings(payload: SiteSettings): Promise<SiteSettings> {
    const result = await this.pool.query<DbSettingsRow>(
      `
      INSERT INTO site_settings (
        id, site_title, tagline, primary_cta_label, primary_cta_href,
        secondary_cta_label, secondary_cta_href,
        banner_badge, banner_headline, banner_description,
        banner_image_url, avatar_image_url, afdian_url,
        social_links, music_preview_clips, featured_work_ids, ui_text
      )
      VALUES ('default', $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        site_title = EXCLUDED.site_title,
        tagline = EXCLUDED.tagline,
        primary_cta_label = EXCLUDED.primary_cta_label,
        primary_cta_href = EXCLUDED.primary_cta_href,
        secondary_cta_label = EXCLUDED.secondary_cta_label,
        secondary_cta_href = EXCLUDED.secondary_cta_href,
        banner_badge = EXCLUDED.banner_badge,
        banner_headline = EXCLUDED.banner_headline,
        banner_description = EXCLUDED.banner_description,
        banner_image_url = EXCLUDED.banner_image_url,
        avatar_image_url = EXCLUDED.avatar_image_url,
        afdian_url = EXCLUDED.afdian_url,
        social_links = EXCLUDED.social_links,
        music_preview_clips = EXCLUDED.music_preview_clips,
        featured_work_ids = EXCLUDED.featured_work_ids,
        ui_text = EXCLUDED.ui_text,
        updated_at = NOW()
      RETURNING site_title, tagline, primary_cta_label, primary_cta_href,
                secondary_cta_label, secondary_cta_href,
                banner_badge, banner_headline, banner_description,
                banner_image_url, avatar_image_url, afdian_url,
                social_links, music_preview_clips, featured_work_ids, ui_text, updated_at
    `,
      [
        payload.siteTitle,
        payload.tagline,
        payload.primaryCtaLabel,
        payload.primaryCtaHref,
        payload.secondaryCtaLabel,
        payload.secondaryCtaHref,
        payload.bannerBadge,
        payload.bannerHeadline,
        payload.bannerDescription,
        payload.bannerImageUrl,
        payload.avatarImageUrl,
        payload.afdianUrl,
        JSON.stringify(payload.socialLinks),
        JSON.stringify(payload.musicPreviewClips),
        JSON.stringify(payload.featuredWorkIds),
        JSON.stringify(payload.uiText)
      ]
    );

    return mapSettings(result.rows[0]);
  }

  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const result = await this.pool.query<DbAdminRow>(
      `
      SELECT id, username, password_hash, created_at
      FROM admin_users
      WHERE username = $1
      LIMIT 1
    `,
      [username]
    );

    if (!result.rows[0]) {
      if (username !== config.adminUsername) {
        return null;
      }

      return {
        id: "env-admin",
        username: config.adminUsername,
        passwordHash: bcrypt.hashSync(config.adminPassword, 10),
        createdAt: new Date().toISOString()
      };
    }

    return {
      id: result.rows[0].id,
      username: result.rows[0].username,
      passwordHash: result.rows[0].password_hash,
      createdAt: result.rows[0].created_at
    };
  }
}
