import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { saveUploadedAsset } from "../lib/assetStorage.js";
import { schedulePublicSitePublish } from "../lib/publicSitePublisher.js";
import { getPublicAssetRepoRelativePath } from "../lib/uploads.js";
import { adminCookieOptions, parseAdminToken, requireAdmin, signAdminToken } from "../middleware/auth.js";
import { SiteStore } from "../store/types.js";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

const mediaUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value) || /^\/?uploads\/\S+$/i.test(value), "请输入有效的媒体链接");

const linkUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), "请输入有效的链接");

const optionalText = (max: number) => z.string().trim().max(max);
const lineItemSchema = z.string().trim().min(1).max(240);
const detailSectionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(3000)
});
const musicPreviewClipSchema = z  .object({
    id: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(120),
    sourceUrl: mediaUrlSchema.refine((value) => Boolean(value), "请先上传音频文件"),
    sourceName: z.string().trim().min(1).max(240),
    startTime: z.number().min(0),
    endTime: z.number().positive()
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "片段结束时间必须大于开始时间",
    path: ["endTime"]
  });

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z
    .string()
    .trim()
    .refine((value) => value.startsWith("image/") || value.startsWith("audio/"), "只允许上传图片或音频文件"),
  contentBase64: z.string().min(1),
  slot: z.string().trim().max(80).optional()
});

const workSchema = z.object({
  title: optionalText(140).optional(),
  type: z.enum(["music", "software", "game", "animation"]).optional(),
  summary: optionalText(300).optional(),
  detailIntro: optionalText(3000).optional(),
  background: optionalText(4000).optional(),
  process: optionalText(4000).optional(),
  result: optionalText(4000).optional(),
  featureList: z.array(lineItemSchema).max(12).optional(),
  interactionPoints: z.array(lineItemSchema).max(12).optional(),
  galleryImages: z.array(mediaUrlSchema).max(20).optional(),
  detailSections: z.array(detailSectionSchema).max(8).optional(),
  platform: optionalText(120).optional(),
  status: optionalText(120).optional(),
  coverUrl: mediaUrlSchema.optional(),
  demoUrl: linkUrlSchema.optional(),
  repoUrl: linkUrlSchema.optional(),
  publishedAt: z.string().trim().min(4).optional()
});
const pageSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  hero: z.string().trim().min(1).max(1000).optional(),
  body: z.string().trim().min(1).max(4000).optional(),
  highlights: z.array(z.string().trim().min(1).max(180)).max(12).optional()
});

const settingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(140),
  tagline: z.string().trim().min(1).max(180),
  primaryCtaLabel: z.string().trim().min(1).max(60),
  primaryCtaHref: z.string().trim().min(1).max(180),
  secondaryCtaLabel: z.string().trim().min(1).max(60),
  secondaryCtaHref: z.string().trim().min(1).max(180),
  bannerBadge: z.string().trim().min(1).max(40),
  bannerHeadline: z.string().trim().min(1).max(240),
  bannerDescription: z.string().trim().min(1).max(500),
  bannerImageUrl: mediaUrlSchema,
  avatarImageUrl: mediaUrlSchema,
  afdianUrl: mediaUrlSchema,
  socialLinks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        url: z.string().trim().url()
      })
    )
    .max(20),
  musicPreviewClips: z.array(musicPreviewClipSchema).max(40),
  featuredWorkIds: z.array(z.string().trim().min(1).max(120)).max(6),
  uiText: z.any()
});

export function createAdminRouter(store: SiteStore): Router {
  const router = Router();

  router.post("/login", async (req, res, next) => {
    try {
      const payload = loginSchema.parse(req.body);
      const user = await store.getAdminByUsername(payload.username);

      if (!user) {
        res.status(401).json({ message: "账号或密码错误" });
        return;
      }

      const ok = await bcrypt.compare(payload.password, user.passwordHash);
      if (!ok) {
        res.status(401).json({ message: "账号或密码错误" });
        return;
      }

      const token = signAdminToken({ userId: user.id, username: user.username });
      res.cookie("admin_token", token, adminCookieOptions());
      res.json({ message: "登录成功" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "请求参数不合法" });
        return;
      }

      next(error);
    }
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie("admin_token", { ...adminCookieOptions(), maxAge: 0 });
    res.status(204).send();
  });

  router.get("/me", (req, res) => {
    const token = req.cookies?.admin_token as string | undefined;
    const payload = token ? parseAdminToken(token) : null;

    if (!payload) {
      res.json({ authenticated: false });
      return;
    }

    res.json({ authenticated: true, username: payload.username });
  });

  router.use(requireAdmin);

  router.post("/assets", async (req, res, next) => {
    try {
      const payload = uploadSchema.parse(req.body);
      const storedAsset = await saveUploadedAsset(payload, {
        protocol: req.protocol,
        host: req.get("host") ?? "localhost"
      });

      if (storedAsset.storage === "local") {
        schedulePublicSitePublish({
          paths: [getPublicAssetRepoRelativePath(storedAsset.key)],
          reason: "Sync public site asset"
        });
      }

      res.status(201).json({ url: storedAsset.url, fileName: storedAsset.fileName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "上传参数不合法" });
        return;
      }

      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
        return;
      }

      next(error);
    }
  });

  router.get("/messages", async (_req, res, next) => {
    try {
      res.json(await store.getMessages());
    } catch (error) {
      next(error);
    }
  });

  router.get("/reviews", async (_req, res, next) => {
    try {
      res.json(await store.getReviews());
    } catch (error) {
      next(error);
    }
  });

  router.get("/works", async (_req, res, next) => {
    try {
      res.json(await store.getWorks());
    } catch (error) {
      next(error);
    }
  });

  router.post("/works", async (req, res, next) => {
    try {
      const payload = workSchema.parse(req.body);
      const work = await store.createWork(payload);
      res.status(201).json(work);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "请求参数不合法" });
        return;
      }

      next(error);
    }
  });

  router.put("/works/:workId", async (req, res, next) => {
    try {
      const payload = workSchema.partial().parse(req.body);
      const work = await store.updateWork(req.params.workId, payload);

      if (!work) {
        res.status(404).json({ message: "未找到作品" });
        return;
      }

      res.json(work);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "请求参数不合法" });
        return;
      }

      next(error);
    }
  });

  router.delete("/works/:workId", async (req, res, next) => {
    try {
      const deleted = await store.deleteWork(req.params.workId);
      if (!deleted) {
        res.status(404).json({ message: "未找到作品" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/pages", async (_req, res, next) => {
    try {
      res.json(await store.getPages());
    } catch (error) {
      next(error);
    }
  });

  router.put("/pages/:slug", async (req, res, next) => {
    try {
      const payload = pageSchema.parse(req.body);
      const page = await store.upsertPage(req.params.slug, payload);
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "请求参数不合法" });
        return;
      }

      next(error);
    }
  });

  router.get("/site-settings", async (_req, res, next) => {
    try {
      res.json(await store.getSiteSettings());
    } catch (error) {
      next(error);
    }
  });

  router.put("/site-settings", async (req, res, next) => {
    try {
      const payload = settingsSchema.parse(req.body);
      const current = await store.getSiteSettings();
      const updated = await store.updateSiteSettings({
        ...payload,
        uiText: payload.uiText ?? current.uiText,
        updatedAt: current.updatedAt
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "请求参数不合法" });
        return;
      }

      next(error);
    }
  });

  return router;
}










