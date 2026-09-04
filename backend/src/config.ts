import dotenv from "dotenv";

import { defaultLocalAdminOrigins } from "./middleware/localAdmin.js";

dotenv.config();

export type AssetStorageMode = "local" | "r2";

function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value === "true" || value === "1";
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalUrl(value: string | undefined): string | undefined {
  const trimmed = normalizeOptionalString(value);
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
}

function parseCorsOrigins(value: string | undefined): string[] {
  const raw = value ?? "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveAssetStorageMode(value: string | undefined, isProduction: boolean): AssetStorageMode {
  if (isProduction) {
    return "r2";
  }

  return value?.trim().toLowerCase() === "r2" ? "r2" : "local";
}

const nodeEnv = process.env.NODE_ENV?.trim() || "development";
const isProduction = nodeEnv === "production";

export const config = {
  nodeEnv,
  isProduction,
  localAdminMode: !isProduction,
  localAdminOrigins: process.env.LOCAL_ADMIN_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? defaultLocalAdminOrigins,
  port: Number(process.env.PORT ?? "4000"),
  jwtSecret: process.env.JWT_SECRET ?? "replace-this-secret",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  databaseUrl: normalizeOptionalString(process.env.DATABASE_URL),
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "change-me-now",
  secureCookie: boolEnv(process.env.SECURE_COOKIE, false),
  assetStorageMode: resolveAssetStorageMode(process.env.ASSET_STORAGE_MODE, isProduction),
  autoPublishPublicSite: boolEnv(process.env.AUTO_PUBLISH_PUBLIC_SITE, !isProduction),
  autoPublishBranch: process.env.AUTO_PUBLISH_BRANCH?.trim() || "main",
  autoPublishRemote: process.env.AUTO_PUBLISH_REMOTE?.trim() || "origin",
  autoPublishDebounceMs: numberEnv(process.env.AUTO_PUBLISH_DEBOUNCE_MS, 2500),
  r2: {
    accountId: normalizeOptionalString(process.env.R2_ACCOUNT_ID),
    bucket: normalizeOptionalString(process.env.R2_BUCKET),
    accessKeyId: normalizeOptionalString(process.env.R2_ACCESS_KEY_ID),
    secretAccessKey: normalizeOptionalString(process.env.R2_SECRET_ACCESS_KEY),
    publicBaseUrl: normalizeOptionalUrl(process.env.R2_PUBLIC_BASE_URL)
  }
};

export function validateRuntimeConfig(): void {
  if (!config.isProduction) {
    return;
  }

  const missing: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    missing.push("DATABASE_URL");
  }

  if (!process.env.JWT_SECRET?.trim()) {
    missing.push("JWT_SECRET");
  }

  if (!process.env.ADMIN_USERNAME?.trim()) {
    missing.push("ADMIN_USERNAME");
  }

  if (!process.env.ADMIN_PASSWORD?.trim()) {
    missing.push("ADMIN_PASSWORD");
  }

  if (!process.env.CORS_ORIGIN?.trim()) {
    missing.push("CORS_ORIGIN");
  }

  if (!process.env.R2_ACCOUNT_ID?.trim()) {
    missing.push("R2_ACCOUNT_ID");
  }

  if (!process.env.R2_BUCKET?.trim()) {
    missing.push("R2_BUCKET");
  }

  if (!process.env.R2_ACCESS_KEY_ID?.trim()) {
    missing.push("R2_ACCESS_KEY_ID");
  }

  if (!process.env.R2_SECRET_ACCESS_KEY?.trim()) {
    missing.push("R2_SECRET_ACCESS_KEY");
  }

  if (!process.env.R2_PUBLIC_BASE_URL?.trim()) {
    missing.push("R2_PUBLIC_BASE_URL");
  }

  if (config.assetStorageMode !== "r2") {
    missing.push("ASSET_STORAGE_MODE=r2 (production is required to use Cloudflare R2)");
  }

  if (!config.secureCookie) {
    missing.push("SECURE_COOKIE=true");
  }

  if (!config.corsOrigins.length) {
    missing.push("at least one valid CORS_ORIGIN");
  }

  if (missing.length) {
    throw new Error(`Production configuration is incomplete: ${missing.join(", ")}`);
  }
}
