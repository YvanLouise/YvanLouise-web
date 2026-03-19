export function resolvePublicSiteUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;

  if (configured) {
    try {
      const current = typeof window !== "undefined" ? new URL(window.location.href) : undefined;
      const target = new URL(configured, current?.origin);

      if (
        current &&
        (current.hostname === "localhost" || current.hostname === "127.0.0.1") &&
        (target.hostname === "localhost" || target.hostname === "127.0.0.1")
      ) {
        target.hostname = current.hostname;
        target.protocol = current.protocol;
      }

      return target.toString().replace(/\/$/, "");
    } catch {
      return configured.replace(/\/$/, "");
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:5173`;
  }

  return "http://localhost:5173";
}
