import { createHash, createHmac } from "crypto";
import path from "path";
import { config } from "../config.js";
import { PreparedAssetPayload, StoredAsset, buildPublicAssetUrl } from "./uploads.js";

interface R2UploadInput {
  objectKey: string;
  buffer: Buffer;
  mimeType: string;
}

function getR2ConfigOrThrow() {
  const { accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl } = config.r2;

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error("Cloudflare R2 配置不完整，请检查 R2_ACCOUNT_ID、R2_BUCKET、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY 和 R2_PUBLIC_BASE_URL。");
  }

  return { accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl };
}

function hashSha256Hex(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toDateStamp(date: Date): string {
  return toAmzDate(date).slice(0, 8);
}

function getSigningKey(secretAccessKey: string, dateStamp: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, "auto");
  const kService = hmacSha256(kRegion, "s3");
  return hmacSha256(kService, "aws4_request");
}

function encodeObjectKey(objectKey: string): string {
  return objectKey
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildR2PublicUrl(objectKey: string): string {
  return buildPublicAssetUrl(getR2ConfigOrThrow().publicBaseUrl, objectKey);
}

async function putR2Object({ objectKey, buffer, mimeType }: R2UploadInput): Promise<void> {
  const { accountId, bucket, accessKeyId, secretAccessKey } = getR2ConfigOrThrow();
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const encodedObjectKey = encodeObjectKey(objectKey);
  const canonicalUri = `/${bucket}/${encodedObjectKey}`;
  const url = `https://${host}${canonicalUri}`;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const payloadHash = hashSha256Hex(buffer);
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashSha256Hex(canonicalRequest)].join("\n");
  const signingKey = getSigningKey(secretAccessKey, dateStamp);
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": mimeType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    },
    body: new Uint8Array(buffer)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`上传到 Cloudflare R2 失败（${response.status} ${response.statusText}）${errorBody ? `：${errorBody}` : ""}`);
  }
}

export async function uploadR2Buffer({ objectKey, buffer, mimeType }: R2UploadInput): Promise<StoredAsset> {
  await putR2Object({ objectKey, buffer, mimeType });

  return {
    fileName: path.posix.basename(objectKey),
    key: objectKey,
    url: buildR2PublicUrl(objectKey),
    storage: "r2"
  };
}

export async function saveR2PreparedAsset(asset: PreparedAssetPayload): Promise<StoredAsset> {
  return uploadR2Buffer({
    objectKey: asset.objectKey,
    buffer: asset.buffer,
    mimeType: asset.mimeType
  });
}
