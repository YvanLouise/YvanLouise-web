import { Router } from "express";
import { z } from "zod";
import { createSimpleLimiter } from "../middleware/rateLimit.js";
import { SiteStore, WorkType } from "../store/types.js";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1200),
  visitorName: z.string().trim().max(80).optional()
});

const messageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(2).max(150),
  body: z.string().trim().min(10).max(2000)
});

const reviewLimiter = createSimpleLimiter(8, 60_000);
const messageLimiter = createSimpleLimiter(6, 60_000);

function isWorkType(value: string | undefined): value is WorkType {
  return value === "music" || value === "software" || value === "game" || value === "animation";
}

export function createPublicRouter(store: SiteStore): Router {
  const router = Router();

  router.get("/works", async (req, res, next) => {
    try {
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const works = await store.getWorks(isWorkType(type) ? type : undefined);
      res.json(works);
    } catch (error) {
      next(error);
    }
  });

  router.get("/works/:workId", async (req, res, next) => {
    try {
      const workId = req.params.workId as string;
      const work = await store.getWorkById(workId);
      if (!work) {
        res.status(404).json({ message: "未找到作品" });
        return;
      }

      res.json(work);
    } catch (error) {
      next(error);
    }
  });

  router.post("/works/:workId/reviews", reviewLimiter, async (req, res, next) => {
    try {
      const payload = reviewSchema.parse(req.body);
      const workId = req.params.workId as string;
      const work = await store.getWorkById(workId);

      if (!work) {
        res.status(404).json({ message: "未找到作品" });
        return;
      }

      await store.createReview({
        workId: work.id,
        rating: payload.rating,
        comment: payload.comment,
        visitorName: payload.visitorName,
        ownerOnly: true
      });

      res.status(201).json({ message: "反馈已提交，仅作者可见。" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "请求参数不合法" });
        return;
      }

      next(error);
    }
  });

  router.post("/messages", messageLimiter, async (req, res, next) => {
    try {
      const payload = messageSchema.parse(req.body);
      await store.createMessage(payload);
      res.status(201).json({ message: "私信已送达站长收件箱。" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? "请求参数不合法" });
        return;
      }

      next(error);
    }
  });

  router.get("/pages/:slug", async (req, res, next) => {
    try {
      const slug = req.params.slug as string;
      const page = await store.getPage(slug);
      if (!page) {
        res.status(404).json({ message: "页面不存在" });
        return;
      }

      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/site-settings", async (_req, res, next) => {
    try {
      const settings = await store.getSiteSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
