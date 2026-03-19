import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { getSamplePage } from "@shared/data/sampleData";
import { getPage } from "@shared/lib/api";
import { readCachedPage } from "@shared/lib/siteCache";
import { PageContent } from "@shared/types";

export function SupportPage(): JSX.Element {
  const [content, setContent] = useState<PageContent>(() => readCachedPage("support") ?? getSamplePage("support"));
  const { uiText } = useSiteSettings();
  const copy = uiText.support;

  useEffect(() => {
    void getPage("support").then(setContent).catch(() => undefined);
  }, []);

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.support}</span>
        <h1>{content.title}</h1>
        <p>{content.hero}</p>
      </section>

      <section className="section support-grid">
        {content.highlights.map((item, index) => (
          <article className="support-card panel" key={item}>
            <span className="badge">{copy.methodBadgePrefix} {index + 1}</span>
            <h3>{item}</h3>
            <p style={{ marginBottom: 0 }}>{copy.methodNotes[index] ?? copy.methodNotes[copy.methodNotes.length - 1] ?? ""}</p>
          </article>
        ))}
      </section>

      <section className="section panel stack">
        <h2 style={{ margin: 0 }}>{copy.usageTitle}</h2>
        <p style={{ margin: 0 }}>{content.body}</p>
        <div className="cta-row">
          <Link to="/contact" className="btn btn-primary">{copy.primaryLabel}</Link>
          <Link to="/works" className="btn btn-secondary">{copy.secondaryLabel}</Link>
        </div>
      </section>
    </>
  );
}
