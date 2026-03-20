import crypto from "node:crypto";
import { saveReview } from "./_lib/blobs.js";
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
  const rating = Number(body.rating || 0);
  const payload = {
    id: crypto.randomUUID(),
    workId: String(body.workId || "").trim(),
    rating,
    comment: String(body.comment || "").trim(),
    visitorName: String(body.visitorName || "").trim() || undefined,
    ownerOnly: true,
    createdAt: new Date().toISOString()
  };

  if (!payload.workId || !payload.comment || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return jsonResponse(400, { message: "请先填写完整的评分和评论内容。" }, getPublicCorsHeaders(event));
  }

  try {
    await saveReview(payload);
    return jsonResponse(200, { message: "评分与评论已提交，仅作者可见。" }, getPublicCorsHeaders(event));
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "评论提交失败，请稍后再试。" }, getPublicCorsHeaders(event));
  }
}
