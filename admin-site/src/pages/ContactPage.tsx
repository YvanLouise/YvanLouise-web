import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InlineEditableHighlights, InlineEditableText } from "../components/admin/InlineEditable";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { getSamplePage } from "../data/sampleData";
import { getPage } from "../lib/api";
import { PageContent } from "../types";

interface ContactPageProps {
  mode?: "view" | "edit";
  contentOverride?: PageContent;
  onContentChange?: (patch: Partial<PageContent>) => void;
}

export function ContactPage({ mode = "view", contentOverride, onContentChange }: ContactPageProps): JSX.Element {
  const [content, setContent] = useState<PageContent>(getSamplePage("contact"));
  const { uiText, socialLinks, afdianUrl } = useSiteSettings();

  useEffect(() => {
    if (contentOverride) {
      return;
    }

    void getPage("contact").then(setContent).catch(() => undefined);
  }, [contentOverride]);

  const editMode = mode === "edit";
  const currentContent = contentOverride ?? content;
  const publicLinks = socialLinks.filter((item) => item.label && item.url);

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.contact}</span>
        {editMode ? (
          <InlineEditableText label="联系页标题" value={currentContent.title} onChange={(value) => onContentChange?.({ title: value })} multiline rows={2} />
        ) : (
          <h1>{currentContent.title}</h1>
        )}
        {editMode ? (
          <InlineEditableText label="联系页导语" value={currentContent.hero} onChange={(value) => onContentChange?.({ hero: value })} multiline rows={3} />
        ) : (
          <p>{currentContent.hero}</p>
        )}
      </section>

      <section className="section support-grid">
        <article className="panel stack">
          {editMode ? (
            <>
              <InlineEditableText label="联系页正文" value={currentContent.body} onChange={(value) => onContentChange?.({ body: value })} multiline rows={4} />
              <InlineEditableHighlights label="联系页要点" values={currentContent.highlights} onChange={(values) => onContentChange?.({ highlights: values })} />
            </>
          ) : (
            <>
              <p style={{ margin: 0 }}>{currentContent.body}</p>
              {currentContent.highlights.length ? (
                <ul style={{ marginTop: 0 }}>
                  {currentContent.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </article>

        {publicLinks.length ? (
          <article className="panel stack">
            <h2 style={{ margin: 0 }}>公开联系入口</h2>
            <div className="cta-row">
              {publicLinks.map((item) => (
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
            {editMode ? (
              <>
                <button type="button" className="btn btn-primary btn-static-preview">{uiText.nav.commission}</button>
                <button type="button" className="btn btn-secondary btn-static-preview">{uiText.nav.support}</button>
                {afdianUrl ? <button type="button" className="btn btn-secondary btn-static-preview">{uiText.footer.afdianLabel}</button> : null}
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/commission">{uiText.nav.commission}</Link>
                <Link className="btn btn-secondary" to="/support">{uiText.nav.support}</Link>
                {afdianUrl ? (
                  <a className="btn btn-secondary" href={afdianUrl} target="_blank" rel="noreferrer">
                    {uiText.footer.afdianLabel}
                  </a>
                ) : null}
              </>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
