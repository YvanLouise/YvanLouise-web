import { useEffect, useMemo } from "react";

function resolveAdminSiteUrl(): string {
  const configured = import.meta.env.VITE_ADMIN_SITE_URL as string | undefined;

  const isLocal = typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  if (!isLocal) return "";

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
    if (adminSiteUrl) {
      window.location.replace(adminSiteUrl);
    }
  }, [adminSiteUrl]);

  return (
    <main className="login-page">
      <section className="panel login-card stack">
        <span className="badge">站点已拆分</span>
        <h1 style={{ margin: 0 }}>管理后台仅在本机运行</h1>
        <p className="meta" style={{ margin: 0 }}>
          {adminSiteUrl ? "正在打开本地管理后台，请先确认开发服务已启动。" : "公开网站不提供管理员登录。网站所有者请在本机启动管理后台进行编辑和发布。"}
        </p>
        <a className="btn btn-primary" href={adminSiteUrl || new URL(".", document.baseURI).pathname}>
          {adminSiteUrl ? "打开本地后台" : "返回首页"}
        </a>
      </section>
    </main>
  );
}
