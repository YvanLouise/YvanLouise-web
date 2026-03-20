import { createUploadSignature } from "./_lib/cloudinary.js";
import { requireAdmin, unauthorized } from "./_lib/auth.js";
import { jsonResponse, parseJsonBody } from "./_lib/http.js";

export async function handler(event) {
  const username = requireAdmin(event);
  if (!username) {
    return unauthorized();
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "不支持的请求方式。" });
  }

  const body = parseJsonBody(event);
  const fileName = String(body.fileName || "upload");
  const mimeType = String(body.mimeType || "application/octet-stream");
  const slot = String(body.slot || "media");

  try {
    return jsonResponse(200, createUploadSignature({ fileName, mimeType, slot }));
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "生成上传签名失败。" });
  }
}
