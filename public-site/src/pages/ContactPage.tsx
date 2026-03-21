import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { getSamplePage } from "@shared/data/sampleData";
import { getPage } from "@shared/lib/api";
import { readCachedPage } from "@shared/lib/siteCache";
import { PageContent } from "@shared/types";

export function ContactPage(): JSX.Element {
  const [content, setContent] = useState<PageContent>(() => readCachedPage("contact") ?? getSamplePage("contact"));
  const settings = useSiteSettings();
  const socialLinks = settings.socialLinks.filter((item) => item.label && item.url);

  useEffect(() => {
    void getPage("contact").then(setContent).catch(() => undefined);
  }, []);

  return (
    <>
      <section className="hero">
        <span className="badge">{settings.uiText.pageBadges.contact}</span>
        <h1>{content.title}</h1>
        <p>{content.hero}</p>
      </section>

      <section className="section support-grid">
        <article className="panel stack">
          <p style={{ margin: 0 }}>{content.body}</p>
          {content.highlights.length ? (
            <ul style={{ marginTop: 0 }}>
              {content.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </article>

        {socialLinks.length ? (
          <article className="panel stack">
            <h2 style={{ margin: 0 }}>公开联系入口</h2>
            <div className="cta-row">
              {socialLinks.map((item) => (
                <a key={`${item.label}-${item.url}`} className="btn btn-secondary" href={item.url} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
            </div>
          </article>
        ) : null}

        <article className="panel stack">
          <h2 style={{ margin: 0 }}>进一步交流</h2>
          <div className="cta-row">
            <Link className="btn btn-primary" to="/commission">{settings.uiText.nav.commission}</Link>
            <Link className="btn btn-secondary" to="/support">{settings.uiText.nav.support}</Link>
            {settings.afdianUrl ? (
              <a className="btn btn-secondary" href={settings.afdianUrl} target="_blank" rel="noreferrer">
                {settings.uiText.footer.afdianLabel}
              </a>
            ) : null}
          </div>
        </article>
      </section>
    </>
  );
}
