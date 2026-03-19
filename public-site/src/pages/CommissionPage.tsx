import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { getSamplePage } from "@shared/data/sampleData";
import { getPage } from "@shared/lib/api";
import { readCachedPage } from "@shared/lib/siteCache";
import { PageContent } from "@shared/types";

export function CommissionPage(): JSX.Element {
  const [content, setContent] = useState<PageContent>(() => readCachedPage("commission") ?? getSamplePage("commission"));
  const { uiText } = useSiteSettings();
  const copy = uiText.commission;

  useEffect(() => {
    void getPage("commission").then(setContent).catch(() => undefined);
  }, []);

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.commission}</span>
        <h1>{content.title}</h1>
        <p>{content.hero}</p>
      </section>

      <section className="section card-grid">
        {content.highlights.map((highlight) => (
          <article className="panel" key={highlight}>
            <h3>{highlight}</h3>
            <p style={{ marginBottom: 0 }}>{copy.cardDescription}</p>
          </article>
        ))}
      </section>

      <section className="section panel stack">
        <h2 style={{ margin: 0 }}>{copy.processTitle}</h2>
        <p style={{ margin: 0 }}>{content.body}</p>
        <ol style={{ marginTop: 0 }}>
          {copy.processSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <Link className="btn btn-primary" to="/contact">{copy.ctaLabel}</Link>
      </section>
    </>
  );
}
