import { ADMIN_FUNCTION_BASE, LEGACY_API_BASE, PUBLIC_INTERACTION_BASE } from "./apiEnvironment";
import { requestJson } from "./requestJson";

export async function legacyRequest<T>(path: string, options: RequestInit = {}, fallback?: () => T): Promise<T> {
  try {
    return await requestJson<T>(`${LEGACY_API_BASE}${path}`, { credentials: "include", ...options }, path === "/api/admin/assets" ? 120000 : 15000);
  } catch (error) {
    if (fallback && !options.signal?.aborted) return fallback();
    throw error;
  }
}

export function adminFunctionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestJson<T>(`${ADMIN_FUNCTION_BASE}${path}`, { credentials: "include", ...options });
}

export function publicFunctionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestJson<T>(`${PUBLIC_INTERACTION_BASE}${path}`, options);
}
