import { listReviews } from "./_lib/blobs.js";
import { requireAdmin, unauthorized } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

export async function handler(event) {
  const username = requireAdmin(event);
  if (!username) {
    return unauthorized();
  }

  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { message: "不支持的请求方式。" });
  }

  try {
    const reviews = await listReviews();
    return jsonResponse(200, reviews);
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "读取评论失败。" });
  }
}
