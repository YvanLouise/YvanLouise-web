import crypto from "node:crypto";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sanitizeSegment(value) {
  return String(value || "asset")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "asset";
}

export function createUploadSignature({ fileName, mimeType, slot }) {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000);
  const resourceType = String(mimeType || "").startsWith("audio/") || String(mimeType || "").startsWith("video/") ? "video" : "image";
  const folder = `yvanlouise/${sanitizeSegment(slot)}`;
  const baseName = sanitizeSegment(String(fileName || "upload").replace(/\.[^.]+$/, ""));
  const publicId = `${baseName}-${Date.now()}`;
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(`${paramsToSign}${apiSecret}`).digest("hex");

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId,
    resourceType
  };
}
