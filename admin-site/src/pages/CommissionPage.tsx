import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InlineEditableHighlights, InlineEditableText } from "../components/admin/InlineEditable";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { getSamplePage } from "../data/sampleData";
import { getPage } from "../lib/api";
import { PageContent } from "../types";

interface CommissionPageProps {
  mode?: "view" | "edit";
  contentOverride?: PageContent;
  onContentChange?: (patch: Partial<PageContent>) => void;
}

export function CommissionPage({ mode = "view", contentOverride, onContentChange }: CommissionPageProps): JSX.Element {
  const [content, setContent] = useState<PageContent>(getSamplePage("commission"));
  const { uiText } = useSiteSettings();

  useEffect(() => {
    if (contentOverride) {
      return;
    }

    void getPage("commission").then(setContent).catch(() => undefined);
  }, [contentOverride]);

  const editMode = mode === "edit";
  const currentContent = contentOverride ?? content;
  const copy = uiText.commission;

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.commission}</span>
        {editMode ? (
          <InlineEditableText label="委托页标题" value={currentContent.title} onChange={(value) => onContentChange?.({ title: value })} multiline rows={2} />
        ) : (
          <h1>{currentContent.title}</h1>
        )}
        {editMode ? (
          <InlineEditableText label="委托页导语" value={currentContent.hero} onChange={(value) => onContentChange?.({ hero: value })} multiline rows={3} />
        ) : (
          <p>{currentContent.hero}</p>
        )}
      </section>

      <section className="section card-grid">
        {editMode ? (
          <InlineEditableHighlights label="委托服务项" values={currentContent.highlights} onChange={(values) => onContentChange?.({ highlights: values })} />
        ) : (
          currentContent.highlights.map((highlight) => (
            <article className="panel" key={highlight}>
              <h3>{highlight}</h3>
              <p style={{ marginBottom: 0 }}>{copy.cardDescription}</p>
            </article>
          ))
        )}
      </section>

      <section className="section panel stack">
        <h2 style={{ margin: 0 }}>{copy.processTitle}</h2>
        {editMode ? (
          <InlineEditableText label="委托页说明" value={currentContent.body} onChange={(value) => onContentChange?.({ body: value })} multiline rows={4} />
        ) : (
          <>
            <p style={{ margin: 0 }}>{currentContent.body}</p>
            <ol style={{ marginTop: 0 }}>
              {copy.processSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </>
        )}

        {editMode ? (
          <button type="button" className="btn btn-primary btn-static-preview">{copy.ctaLabel}</button>
        ) : (
          <Link className="btn btn-primary" to="/contact">
            {copy.ctaLabel}
          </Link>
        )}
      </section>
    </>
  );
}
