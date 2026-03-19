import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InlineEditableHighlights, InlineEditableText } from "../components/admin/InlineEditable";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { getSamplePage } from "../data/sampleData";
import { getPage } from "../lib/api";
import { PageContent } from "../types";

interface SupportPageProps {
  mode?: "view" | "edit";
  contentOverride?: PageContent;
  onContentChange?: (patch: Partial<PageContent>) => void;
}

export function SupportPage({ mode = "view", contentOverride, onContentChange }: SupportPageProps): JSX.Element {
  const [content, setContent] = useState<PageContent>(getSamplePage("support"));
  const { uiText } = useSiteSettings();

  useEffect(() => {
    if (contentOverride) {
      return;
    }

    void getPage("support").then(setContent).catch(() => undefined);
  }, [contentOverride]);

  const editMode = mode === "edit";
  const currentContent = contentOverride ?? content;
  const copy = uiText.support;

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.support}</span>
        {editMode ? (
          <InlineEditableText label="支持页标题" value={currentContent.title} onChange={(value) => onContentChange?.({ title: value })} multiline rows={2} />
        ) : (
          <h1>{currentContent.title}</h1>
        )}
        {editMode ? (
          <InlineEditableText label="支持页导语" value={currentContent.hero} onChange={(value) => onContentChange?.({ hero: value })} multiline rows={3} />
        ) : (
          <p>{currentContent.hero}</p>
        )}
      </section>

      <section className="section support-grid">
        {editMode ? (
          <InlineEditableHighlights label="支持方式" values={currentContent.highlights} onChange={(values) => onContentChange?.({ highlights: values })} addLabel="新增支持方式" />
        ) : (
          currentContent.highlights.map((item, index) => (
            <article className="support-card panel" key={item}>
              <span className="badge">{copy.methodBadgePrefix} {index + 1}</span>
              <h3>{item}</h3>
              <p style={{ marginBottom: 0 }}>{copy.methodNotes[index] ?? copy.methodNotes[copy.methodNotes.length - 1] ?? ""}</p>
            </article>
          ))
        )}
      </section>

      <section className="section panel stack">
        <h2 style={{ margin: 0 }}>{copy.usageTitle}</h2>
        {editMode ? (
          <InlineEditableText label="支持页正文" value={currentContent.body} onChange={(value) => onContentChange?.({ body: value })} multiline rows={4} />
        ) : (
          <p style={{ margin: 0 }}>{currentContent.body}</p>
        )}

        <div className="cta-row">
          {editMode ? (
            <>
              <button type="button" className="btn btn-primary btn-static-preview">{copy.primaryLabel}</button>
              <button type="button" className="btn btn-secondary btn-static-preview">{copy.secondaryLabel}</button>
            </>
          ) : (
            <>
              <Link to="/contact" className="btn btn-primary">{copy.primaryLabel}</Link>
              <Link to="/works" className="btn btn-secondary">{copy.secondaryLabel}</Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
