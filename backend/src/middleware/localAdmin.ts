import type { NextFunction, Request, Response } from "express";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const loopbackAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
export const defaultLocalAdminOrigins = [
  "http://localhost:5174", "http://127.0.0.1:5174", "http://[::1]:5174",
  "http://localhost:4174", "http://127.0.0.1:4174", "http://[::1]:4174"
];

export function isLoopbackOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && loopbackHosts.has(url.hostname) && url.origin === value;
  } catch { return false; }
}

export function createLocalAdminGuard(origins: string[] = defaultLocalAdminOrigins) {
  const allowedOrigins = new Set(origins.filter(isLoopbackOrigin));
  return (req: Request, res: Response, next: NextFunction): void => {
    let localHost = false;
    try {
      const host = req.get("host") ?? "";
      const url = new URL(`http://${host}`);
      localHost = loopbackHosts.has(url.hostname) && url.host === host;
    } catch { /* Reject malformed Host headers. */ }
    const origin = req.get("origin");
    const allowedOrigin = origin ? allowedOrigins.has(origin) : req.get("sec-fetch-site") !== "cross-site";
    if (!loopbackAddresses.has(req.socket.remoteAddress ?? "") || !localHost || !allowedOrigin) {
      res.status(403).json({ message: "管理接口仅允许本机管理页面访问。" });
      return;
    }
    if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
      res.status(415).json({ message: "管理请求必须使用 application/json。" });
      return;
    }
    next();
  };
}
