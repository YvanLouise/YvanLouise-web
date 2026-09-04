import { ApiError } from "./apiError";

export async function requestJson<T>(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const abort = (): void => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("请求超时，请检查网络后重试。")), timeoutMs);
  try {
    const headers = new Headers(options.headers);
    if (typeof options.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    if (response.status === 204) return undefined as T;
    const raw = await response.text();
    let body: unknown;
    try { body = JSON.parse(raw); } catch {
      throw new ApiError(response.ok ? "服务器返回了无效数据，请稍后重试。" : `请求失败 (${response.status})，请稍后重试。`, response.status);
    }
    if (!response.ok) {
      const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : `请求失败 (${response.status})`;
      throw new ApiError(message, response.status);
    }
    return body as T;
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
