import { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

export function createSimpleLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function limiter(req: Request, res: Response, next: NextFunction): void {
    const key = req.ip || "unknown";
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= limit) {
      res.status(429).json({ message: "Too many requests, please try again later." });
      return;
    }

    current.count += 1;
    next();
  };
}