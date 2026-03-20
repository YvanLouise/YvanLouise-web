import { readSiteContentSource } from "./_lib/content.js";
import { getPublicCorsHeaders, handlePublicCors, jsonResponse } from "./_lib/http.js";

export async function handler(event) {
  const corsResponse = handlePublicCors(event, "GET, OPTIONS");
  if (corsResponse) {
    return corsResponse;
  }

  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { message: "Unsupported request method." }, getPublicCorsHeaders(event, "GET, OPTIONS"));
  }

  try {
    const result = await readSiteContentSource();
    return jsonResponse(200, { content: result.content, source: result.source }, getPublicCorsHeaders(event, "GET, OPTIONS"));
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "Failed to load public content." }, getPublicCorsHeaders(event, "GET, OPTIONS"));
  }
}
