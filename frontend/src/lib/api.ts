import {
  AdminCredentials,
  Message,
  MessageInput,
  PageContent,
  Review,
  ReviewInput,
  SiteSettings,
  Work,
  WorkType
} from "../types";
import { getSamplePage, mergePagesWithSamples, samplePages, sampleSettings, sampleWorks } from "../data/sampleData";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (configured) {
    if (typeof window !== "undefined") {
      try {
        const configuredUrl = new URL(configured);
        const currentUrl = new URL(window.location.origin);

        if (isLocalHostname(configuredUrl.hostname) && isLocalHostname(currentUrl.hostname)) {
          configuredUrl.hostname = currentUrl.hostname;
          configuredUrl.protocol = currentUrl.protocol;
          return configuredUrl.toString().replace(/\/$/, "");
        }
      } catch {
        return configured;
      }
    }

    return configured;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

const API_BASE = resolveApiBase();

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, fallback?: () => T): Promise<T> {
  const endpoint = `${API_BASE}${path}`;

  try {
    const response = await fetch(endpoint, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      },
      ...options
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new ApiError(body.message ?? "请求失败", response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (fallback) {
      return fallback();
    }

    throw error;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("读取文件失败"));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

export async function getWorks(type?: WorkType): Promise<Work[]> {
  const params = type ? `?type=${type}` : "";
  return request<Work[]>(`/api/works${params}`, {}, () => (type ? sampleWorks.filter((work) => work.type === type) : sampleWorks));
}

export async function getWorkById(workId: string): Promise<Work> {
  return request<Work>(`/api/works/${workId}`, {}, () => {
    const found = sampleWorks.find((work) => work.id === workId);
    if (!found) {
      throw new Error("未找到作品");
    }

    return found;
  });
}

export async function submitReview(workId: string, payload: ReviewInput): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/works/${workId}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    () => ({ message: "评分已提交（演示模式）" })
  );
}

export async function submitMessage(payload: MessageInput): Promise<{ message: string }> {
  return request<{ message: string }>(
    "/api/messages",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    () => ({ message: "私信已发送（演示模式）" })
  );
}

export async function getPage(slug: string): Promise<PageContent> {
  return request<PageContent>(`/api/pages/${slug}`, {}, () => getSamplePage(slug));
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return request<SiteSettings>("/api/site-settings", {}, () => sampleSettings);
}

export async function adminLogin(credentials: AdminCredentials): Promise<{ message: string }> {
  return request<{ message: string }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
}

export async function adminLogout(): Promise<void> {
  await request<void>("/api/admin/logout", { method: "POST" });
}

export async function getAdminMe(): Promise<{ authenticated: boolean; username?: string }> {
  return request<{ authenticated: boolean; username?: string }>("/api/admin/me", {}, () => ({ authenticated: false }));
}

export async function getAdminMessages(): Promise<Message[]> {
  return request<Message[]>("/api/admin/messages", {}, () => []);
}

export async function getAdminReviews(): Promise<Review[]> {
  return request<Review[]>("/api/admin/reviews", {}, () => []);
}

export async function getAdminWorks(): Promise<Work[]> {
  return request<Work[]>("/api/admin/works", {}, () => sampleWorks);
}

export async function createAdminWork(payload: Partial<Work>): Promise<Work> {
  return request<Work>("/api/admin/works", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminWork(workId: string, payload: Partial<Work>): Promise<Work> {
  return request<Work>(`/api/admin/works/${workId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminWork(workId: string): Promise<void> {
  return request<void>(`/api/admin/works/${workId}`, { method: "DELETE" });
}

export async function getAdminPages(): Promise<PageContent[]> {
  const pages = await request<PageContent[]>("/api/admin/pages", {}, () => samplePages);
  return mergePagesWithSamples(pages);
}

export async function updateAdminPage(slug: string, payload: Partial<PageContent>): Promise<PageContent> {
  return request<PageContent>(`/api/admin/pages/${slug}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function getAdminSiteSettings(): Promise<SiteSettings> {
  return request<SiteSettings>("/api/admin/site-settings", {}, () => sampleSettings);
}

export async function updateAdminSiteSettings(payload: SiteSettings): Promise<SiteSettings> {
  return request<SiteSettings>("/api/admin/site-settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function uploadAdminAsset(file: File, slot: string): Promise<{ url: string; fileName: string }> {
  const contentBase64 = await fileToBase64(file);

  return request<{ url: string; fileName: string }>("/api/admin/assets", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64,
      slot
    })
  });
}

export { ApiError };
