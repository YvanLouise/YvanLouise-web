import { requireAdmin, unauthorized } from "./_lib/auth.js";
import { readSiteContentSource, writeSiteContentSource } from "./_lib/content.js";
import { jsonResponse, parseJsonBody } from "./_lib/http.js";

export async function handler(event) {
  try {
    const username = requireAdmin(event);
    if (!username) {
      return unauthorized();
    }

    if (event.httpMethod === "GET") {
      try {
        const result = await readSiteContentSource();
        return jsonResponse(200, { content: result.content, source: result.source, username });
      } catch (error) {
        return jsonResponse(500, { message: error instanceof Error ? error.message : "Failed to read site content." });
      }
    }

    if (event.httpMethod === "PUT") {
      const body = parseJsonBody(event);
      const content = body.content;
      const message = String(body.message || "").trim() || `admin: content update by ${username}`;

      if (!content || typeof content !== "object") {
        return jsonResponse(400, { message: "Missing content payload to save." });
      }

      try {
        const result = await writeSiteContentSource(content, message);
        return jsonResponse(200, { content: result.content, source: result.source, message: "Public content saved." });
      } catch (error) {
        return jsonResponse(500, { message: error instanceof Error ? error.message : "Failed to save site content." });
      }
    }

    return jsonResponse(405, { message: "Unsupported request method." });
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "Admin content function crashed unexpectedly." });
  }
}
