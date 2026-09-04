import { PropsWithChildren, useEffect, useState } from "react";
import { SiteFooter } from "@shared/components/shared/SiteFooter";
import { SiteSettingsProvider } from "@shared/context/SiteSettingsContext";
import { getSiteSettings } from "@shared/lib/api";
import { createHydrationSafeSiteSettings, readCachedSiteSettings } from "@shared/lib/siteCache";
import { SiteSettings } from "@shared/types";
import { PublicSiteNav } from "../components/PublicSiteNav";
import { useLocation } from "react-router-dom";

interface PublicSiteLayoutProps extends PropsWithChildren {
  embedded?: boolean;
}

export function PublicSiteLayout({ children, embedded = false }: PublicSiteLayoutProps): JSX.Element {
  const [settings, setSettings] = useState<SiteSettings>(() => readCachedSiteSettings() ?? createHydrationSafeSiteSettings());
  const { pathname } = useLocation();
  useEffect(() => {
    const names: Record<string, string> = { "/": "首页", "/about": "关于", "/works": "作品", "/commission": "委托", "/support": "支持", "/contact": "联系" };
    document.title = `${names[pathname] ?? (pathname.startsWith("/works/") ? "作品详情" : "页面")} | ${settings.siteTitle}`;
  }, [pathname, settings.siteTitle]);

  useEffect(() => {
    let mounted = true;

    void getSiteSettings()
      .then((response) => {
        if (mounted) {
          setSettings(response);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteSettingsProvider value={settings}>
      <div className="page-shell">
        <a href="#main-content" className="skip-link">
          {settings.uiText.nav.skipToContent}
        </a>

        {embedded ? null : <PublicSiteNav settings={settings} />}

        <main id="main-content" className="page-main" tabIndex={-1}>{children}</main>

        {embedded ? null : <SiteFooter settings={settings} />}
      </div>
    </SiteSettingsProvider>
  );
}
