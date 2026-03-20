import crypto from "node:crypto";
import { saveMessage } from "./_lib/blobs.js";
import { getPublicCorsHeaders, handlePublicCors, jsonResponse, parseJsonBody } from "./_lib/http.js";

export async function handler(event) {
  const corsResponse = handlePublicCors(event);
  if (corsResponse) {
    return corsResponse;
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "不支持的请求方式。" }, getPublicCorsHeaders(event));
  }

  const body = parseJsonBody(event);
  const payload = {
    id: crypto.randomUUID(),
    name: String(body.name || "").trim(),
    contact: String(body.contact || "").trim(),
    subject: String(body.subject || "").trim(),
    body: String(body.body || "").trim(),
    status: "new",
    createdAt: new Date().toISOString()
  };

  if (!payload.name || !payload.contact || !payload.subject || payload.body.length < 10) {
    return jsonResponse(400, { message: "请完整填写称呼、联系方式、主题和私信内容。" }, getPublicCorsHeaders(event));
  }

  try {
    await saveMessage(payload);
    return jsonResponse(200, { message: "私信已发送，我会尽快查看。" }, getPublicCorsHeaders(event));
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "私信发送失败，请稍后再试。" }, getPublicCorsHeaders(event));
  }
}
