import { PropsWithChildren, useEffect, useState } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { SiteFooter } from "../components/shared/SiteFooter";
import { SiteNav } from "../components/shared/SiteNav";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import { sampleSettings } from "../data/sampleData";
import { getSiteSettings } from "../lib/api";
import { SiteSettings } from "../types";

interface SiteLayoutProps extends PropsWithChildren {
  embedded?: boolean;
}

export function SiteLayout({ children, embedded = false }: SiteLayoutProps): JSX.Element {
  const [settings, setSettings] = useState<SiteSettings>(sampleSettings);

  useEffect(() => {
    let mounted = true;

    void getSiteSettings()
      .then((response) => {
        if (mounted) {
          setSettings(response);
        }
      })
      .catch(() => {
        // Keep sample settings in demo mode.
      });

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

        {embedded ? null : <SiteNav settings={settings} />}

        <main id="main-content" className="page-main">
          <PageTransition>{children}</PageTransition>
        </main>

        {embedded ? null : <SiteFooter settings={settings} />}
      </div>
    </SiteSettingsProvider>
  );
}
