import crypto from "node:crypto";
import { jsonResponse } from "./http.js";

const SESSION_COOKIE_NAME = "yvanlouise_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSessionSecret() {
  return requireEnv("ADMIN_SESSION_SECRET");
}

function createSignature(payload) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function shouldUseSecureCookie() {
  const deployUrl = process.env.URL || "";
  return !deployUrl.startsWith("http://localhost") && !deployUrl.startsWith("http://127.0.0.1");
}

function parseCookies(event) {
  const raw = event.headers?.cookie || event.headers?.Cookie || "";
  return raw.split(";").reduce((acc, pair) => {
    const [key, ...rest] = pair.split("=");
    if (!key) {
      return acc;
    }
    acc[key.trim()] = rest.join("=").trim();
    return acc;
  }, {});
}

export async function verifyAdminCredentials(username, password) {
  const expectedUsername = requireEnv("ADMIN_USERNAME");
  const passwordHash = requireEnv("ADMIN_PASSWORD_HASH");

  if (username !== expectedUsername) {
    return false;
  }

  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, passwordHash);
}

export function createSessionToken(username) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
    }),
    "utf8"
  ).toString("base64url");

  return `${payload}.${createSignature(payload)}`;
}

export function readSessionUsername(event) {
  const token = parseCookies(event)[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== createSignature(payload)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded || typeof decoded.username !== "string" || typeof decoded.exp !== "number") {
      return null;
    }

    if (decoded.exp < Date.now()) {
      return null;
    }

    return decoded.username;
  } catch {
    return null;
  }
}

export function buildSessionCookie(token) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ];

  if (shouldUseSecureCookie()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function buildLogoutCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (shouldUseSecureCookie()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function requireAdmin(event) {
  const username = readSessionUsername(event);
  if (!username) {
    return null;
  }

  return username;
}

export function unauthorized(message = "Please log in to the admin site first.") {
  return jsonResponse(401, { message });
}
