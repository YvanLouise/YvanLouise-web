import { readSessionUsername } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

export async function handler(event) {
  const username = readSessionUsername(event);

  return jsonResponse(200, {
    authenticated: Boolean(username),
    username: username || undefined
  });
}
