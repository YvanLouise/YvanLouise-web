import { buildSessionCookie, createSessionToken, verifyAdminCredentials } from "./_lib/auth.js";
import { jsonResponse, parseJsonBody } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "不支持的请求方式。" });
  }

  const body = parseJsonBody(event);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return jsonResponse(400, { message: "请输入用户名和密码。" });
  }

  try {
    const ok = await verifyAdminCredentials(username, password);
    if (!ok) {
      return jsonResponse(401, { message: "用户名或密码不正确。" });
    }

    return jsonResponse(
      200,
      {
        message: "登录成功。"
      },
      {
        "Set-Cookie": buildSessionCookie(createSessionToken(username))
      }
    );
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "登录失败，请稍后再试。" });
  }
}
