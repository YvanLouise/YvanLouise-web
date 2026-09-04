export type SiteRuntime = "public" | "admin";

function resolveLegacyApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!configured) {
    return "";
  }

  if (typeof window !== "undefined") {
    try {
      const configuredUrl = new URL(configured);
      const currentUrl = new URL(window.location.origin);
      const isConfiguredLocal = configuredUrl.hostname === "localhost" || configuredUrl.hostname === "127.0.0.1";
      const isCurrentLocal = currentUrl.hostname === "localhost" || currentUrl.hostname === "127.0.0.1";

      if (isConfiguredLocal && isCurrentLocal) {
        configuredUrl.hostname = currentUrl.hostname;
        configuredUrl.protocol = currentUrl.protocol;
        return configuredUrl.toString().replace(/\/$/, "");
      }
    } catch {
      return configured;
    }
  }

  return configured.replace(/\/$/, "");
}

function resolveSiteRuntime(): SiteRuntime {
  const configured = (import.meta.env.VITE_SITE_RUNTIME as string | undefined)?.trim().toLowerCase();
  if (configured === "public" || configured === "admin") {
    return configured;
  }

  return (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim() ? "admin" : "public";
}

function resolveAdminFunctionBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/$/, "")}/.netlify/functions`;
  }

  return "/.netlify/functions";
}

function resolvePublicInteractionBase(): string {
  const configured = (import.meta.env.VITE_PUBLIC_INTERACTION_BASE as string | undefined)?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const adminSiteUrl = (import.meta.env.VITE_ADMIN_SITE_URL as string | undefined)?.trim();
  if (adminSiteUrl) {
    return `${adminSiteUrl.replace(/\/$/, "")}/.netlify/functions`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/$/, "")}/.netlify/functions`;
  }

  return "/.netlify/functions";
}

function normalizeBasePath(value: string): string {
  if (!value) {
    return "/";
  }

  let next = value.trim();
  if (!next.startsWith("/")) {
    next = `/${next}`;
  }
  if (!next.endsWith("/")) {
    next += "/";
  }
  return next;
}

function resolveRuntimePublicBasePath(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const repoBase = normalizeBasePath((import.meta.env.VITE_REPOSITORY_BASE as string | undefined) || "/YvanLouise-web/");
  const onGithubPagesHost = /\.github\.io$/i.test(window.location.hostname);
  if (!onGithubPagesHost) {
    return "/";
  }

  const currentPath = normalizeBasePath(window.location.pathname);
  return currentPath.startsWith(repoBase) ? repoBase : "/";
}

function resolveStaticContentUrl(): string {
  if (typeof window === "undefined") {
    return "/site-content.json";
  }

  const basePath = resolveRuntimePublicBasePath();
  const normalizedBase = basePath === "/" ? window.location.origin : `${window.location.origin}${basePath.replace(/\/$/, "")}`;
  return `${normalizedBase}/site-content.json`;
}

export const LEGACY_API_BASE = resolveLegacyApiBase();
export const LEGACY_BACKEND_MODE = Boolean(import.meta.env.VITE_API_BASE_URL);
export const SITE_RUNTIME = resolveSiteRuntime();
export const STATIC_PUBLIC_SITE_MODE = !LEGACY_BACKEND_MODE && SITE_RUNTIME === "public";
export const ADMIN_FUNCTION_BASE = resolveAdminFunctionBase();
export const PUBLIC_INTERACTION_BASE = resolvePublicInteractionBase();
export const PUBLIC_CONTENT_BASE = (() => {
  const configured = (import.meta.env.VITE_PUBLIC_CONTENT_BASE as string | undefined)?.trim();
  return configured ? configured.replace(/\/$/, "") : PUBLIC_INTERACTION_BASE;
})();
export const STATIC_CONTENT_URL = resolveStaticContentUrl();
