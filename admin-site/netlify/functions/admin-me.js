import { readSessionUsername } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

export async function handler(event) {
  try {
    const username = readSessionUsername(event);

    return jsonResponse(200, {
      authenticated: Boolean(username),
      username: username || undefined
    });
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "Failed to read admin session." });
  }
}
