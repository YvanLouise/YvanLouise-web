import { buildLogoutCookie } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "不支持的请求方式。" });
  }

  return jsonResponse(
    200,
    {
      message: "已退出后台。"
    },
    {
      "Set-Cookie": buildLogoutCookie()
    }
  );
}
