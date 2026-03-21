import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { promises as fsp } from "fs";
import { fileURLToPath } from "url";

export const IMAGE_MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const AUDIO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/flac": ".flac"
};

const EXTENSION_MIME_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXTENSION_MAP).map(([mimeType, extension]) => [extension, mimeType])
);

const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../content/public/uploads");

export interface UploadedAssetPayload {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  slot?: string;
}

export interface PreparedAssetPayload {
  fileName: string;
  mimeType: string;
  slot?: string;
  buffer: Buffer;
  objectKey: string;
}

export interface StoredAsset {
  fileName: string;
  key: string;
  url: string;
  storage: "local" | "r2";
}

export interface LocalAssetRequestContext {
  protocol: string;
  host: string;
}

export function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "asset";
}

export function resolveExtension(fileName: string, mimeType: string): string {
  const mappedExtension = MIME_EXTENSION_MAP[mimeType];
  if (mappedExtension) {
    return mappedExtension;
  }

  const fileExtension = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".mp3", ".wav", ".ogg", ".webm", ".m4a", ".aac", ".flac"].includes(fileExtension)) {
    return fileExtension === ".jpeg" ? ".jpg" : fileExtension;
  }

  throw new Error("暂不支持该文件格式，请使用常见图片或音频格式。");
}

export function inferMimeType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  const mimeType = EXTENSION_MIME_MAP[extension === ".jpeg" ? ".jpg" : extension];
  if (!mimeType) {
    throw new Error(`无法识别文件类型：${fileName}`);
  }

  return mimeType;
}

export function isSupportedMediaFile(fileName: string): boolean {
  try {
    inferMimeType(fileName);
    return true;
  } catch {
    return false;
  }
}

function getMaxUploadBytes(mimeType: string): number {
  return mimeType.startsWith("audio/") ? AUDIO_MAX_UPLOAD_BYTES : IMAGE_MAX_UPLOAD_BYTES;
}

function getAssetKindLabel(mimeType: string): string {
  return mimeType.startsWith("audio/") ? "音频" : "文件";
}

export function ensureUploadsDir(): string {
  fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

export function getUploadsDir(): string {
  return ensureUploadsDir();
}

function decodeBase64Content(contentBase64: string): Buffer {
  const normalizedBase64 = contentBase64.replace(/^data:[^,]+,/, "");
  return Buffer.from(normalizedBase64, "base64");
}

function validateAssetBuffer(buffer: Buffer, mimeType: string): void {
  if (buffer.length === 0) {
    throw new Error("上传内容为空，请重新选择文件。");
  }

  const maxBytes = getMaxUploadBytes(mimeType);
  if (buffer.length > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    throw new Error(`${getAssetKindLabel(mimeType)}太大了，请控制在 ${maxMb}MB 以内。`);
  }
}

function createObjectKey(fileName: string, mimeType: string, slot?: string): string {
  const extension = resolveExtension(fileName, mimeType);
  const prefix = sanitizeSegment(slot ?? path.parse(fileName).name);
  return `${prefix}-${Date.now()}-${randomUUID()}${extension}`;
}

export function buildPublicAssetUrl(_baseUrl: string, key: string): string {
  const normalizedKey = key
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `uploads/${normalizedKey}`;
}

export function prepareUploadedAsset(payload: UploadedAssetPayload): PreparedAssetPayload {
  const buffer = decodeBase64Content(payload.contentBase64);
  validateAssetBuffer(buffer, payload.mimeType);

  return {
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    slot: payload.slot,
    buffer,
    objectKey: createObjectKey(payload.fileName, payload.mimeType, payload.slot)
  };
}

export async function saveLocalPreparedAsset(
  asset: PreparedAssetPayload,
  requestContext: LocalAssetRequestContext
): Promise<StoredAsset> {
  const targetPath = path.join(ensureUploadsDir(), asset.objectKey);
  await fsp.writeFile(targetPath, asset.buffer);

  return {
    fileName: asset.objectKey,
    key: asset.objectKey,
    url: buildPublicAssetUrl(`${requestContext.protocol}://${requestContext.host}/uploads`, asset.objectKey),
    storage: "local"
  };
}
