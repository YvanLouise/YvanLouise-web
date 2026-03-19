import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface AdminAuthPayload {
  userId: string;
  username: string;
}

export interface AuthedRequest extends Request {
  admin?: AdminAuthPayload;
}

export function signAdminToken(payload: AdminAuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

export function parseAdminToken(token: string): AdminAuthPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AdminAuthPayload;
  } catch {
    return null;
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_token as string | undefined;
  if (!token) {
    res.status(401).json({ message: "未授权访问" });
    return;
  }

  const payload = parseAdminToken(token);
  if (!payload) {
    res.status(401).json({ message: "登录会话已失效，请重新登录" });
    return;
  }

  req.admin = payload;
  next();
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.secureCookie,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  };
}
