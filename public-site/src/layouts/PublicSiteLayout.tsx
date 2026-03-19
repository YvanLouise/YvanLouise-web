import { PropsWithChildren, useEffect, useState } from "react";
import { PageTransition } from "@shared/components/shared/PageTransition";
import { SiteFooter } from "@shared/components/shared/SiteFooter";
import { SiteSettingsProvider } from "@shared/context/SiteSettingsContext";
import { getSiteSettings } from "@shared/lib/api";
import { createHydrationSafeSiteSettings, readCachedSiteSettings } from "@shared/lib/siteCache";
import { SiteSettings } from "@shared/types";
import { PublicSiteNav } from "../components/PublicSiteNav";

interface PublicSiteLayoutProps extends PropsWithChildren {
  embedded?: boolean;
}

export function PublicSiteLayout({ children, embedded = false }: PublicSiteLayoutProps): JSX.Element {
  const [settings, setSettings] = useState<SiteSettings>(() => readCachedSiteSettings() ?? createHydrationSafeSiteSettings());

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

        <main id="main-content" className="page-main">
          <PageTransition>{children}</PageTransition>
        </main>

        {embedded ? null : <SiteFooter settings={settings} />}
      </div>
    </SiteSettingsProvider>
  );
}
