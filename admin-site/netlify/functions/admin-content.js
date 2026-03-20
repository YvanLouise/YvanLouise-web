import { requireAdmin, unauthorized } from "./_lib/auth.js";
import { readSiteContentSource, writeSiteContentSource } from "./_lib/content.js";
import { jsonResponse, parseJsonBody } from "./_lib/http.js";

export async function handler(event) {
  const username = requireAdmin(event);
  if (!username) {
    return unauthorized();
  }

  if (event.httpMethod === "GET") {
    try {
      const result = await readSiteContentSource();
      return jsonResponse(200, { content: result.content, source: result.source, username });
    } catch (error) {
      return jsonResponse(500, { message: error instanceof Error ? error.message : "读取内容失败。" });
    }
  }

  if (event.httpMethod === "PUT") {
    const body = parseJsonBody(event);
    const content = body.content;
    const message = String(body.message || "").trim() || `admin: content update by ${username}`;

    if (!content || typeof content !== "object") {
      return jsonResponse(400, { message: "缺少要保存的内容数据。" });
    }

    try {
      const result = await writeSiteContentSource(content, message);
      return jsonResponse(200, { content: result.content, source: result.source, message: "公开内容已保存。" });
    } catch (error) {
      return jsonResponse(500, { message: error instanceof Error ? error.message : "保存内容失败。" });
    }
  }

  return jsonResponse(405, { message: "不支持的请求方式。" });
}
