import { NextFunction, Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: "资源不存在" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (typeof err === "object" && err !== null && "type" in err && (err as { type?: string }).type === "entity.too.large") {
    res.status(413).json({ message: "上传内容太大了。图片请控制在 6MB 内，音频请控制在 50MB 内。" });
    return;
  }

  const message = err instanceof Error ? err.message : "服务器发生未知错误";
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message });
}


