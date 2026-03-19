import { useEffect, useMemo } from "react";

function resolveAdminSiteUrl(): string {
  const configured = import.meta.env.VITE_ADMIN_SITE_URL as string | undefined;

  if (configured) {
    try {
      const current = typeof window !== "undefined" ? new URL(window.location.href) : undefined;
      const target = new URL(configured, current?.origin);

      if (current && (current.hostname === "localhost" || current.hostname === "127.0.0.1") && (target.hostname === "localhost" || target.hostname === "127.0.0.1")) {
        target.hostname = current.hostname;
        target.protocol = current.protocol;
      }

      return target.toString().replace(/\/$/, "");
    } catch {
      return configured.replace(/\/$/, "");
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:5174`;
  }

  return "http://localhost:5174";
}

export function LegacyAdminRedirectPage(): JSX.Element {
  const adminSiteUrl = useMemo(() => resolveAdminSiteUrl(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace(adminSiteUrl);
    }
  }, [adminSiteUrl]);

  return (
    <main className="login-page">
      <section className="panel login-card stack">
        <span className="badge">站点已拆分</span>
        <h1 style={{ margin: 0 }}>开发者后台已经迁移到独立站点</h1>
        <p className="meta" style={{ margin: 0 }}>
          系统正在把你跳转到新的开发者站。如果浏览器没有自动跳转，请点击下面的按钮继续。
        </p>
        <a className="btn btn-primary" href={adminSiteUrl}>
          前往开发者站
        </a>
      </section>
    </main>
  );
}
