import { useEffect, useState } from "react";
import { InlineEditableHighlights, InlineEditableText } from "../components/admin/InlineEditable";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { getSamplePage } from "../data/sampleData";
import { getPage } from "../lib/api";
import { PageContent } from "../types";

interface AboutPageProps {
  mode?: "view" | "edit";
  contentOverride?: PageContent;
  onContentChange?: (patch: Partial<PageContent>) => void;
}

export function AboutPage({ mode = "view", contentOverride, onContentChange }: AboutPageProps): JSX.Element {
  const [content, setContent] = useState<PageContent>(getSamplePage("about"));
  const { uiText } = useSiteSettings();

  useEffect(() => {
    if (contentOverride) {
      return;
    }

    void getPage("about").then(setContent).catch(() => undefined);
  }, [contentOverride]);

  const editMode = mode === "edit";
  const currentContent = contentOverride ?? content;

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.about}</span>
        {editMode ? (
          <InlineEditableText label="关于页标题" value={currentContent.title} onChange={(value) => onContentChange?.({ title: value })} multiline rows={2} />
        ) : (
          <h1>{currentContent.title}</h1>
        )}
        {editMode ? (
          <InlineEditableText label="关于页导语" value={currentContent.hero} onChange={(value) => onContentChange?.({ hero: value })} multiline rows={3} />
        ) : (
          <p>{currentContent.hero}</p>
        )}
      </section>

      <section className="section panel stack">
        {editMode ? (
          <InlineEditableText label="关于页正文" value={currentContent.body} onChange={(value) => onContentChange?.({ body: value })} multiline rows={5} />
        ) : (
          <p style={{ margin: 0 }}>{currentContent.body}</p>
        )}

        {editMode ? (
          <InlineEditableHighlights label="关于页要点" values={currentContent.highlights} onChange={(values) => onContentChange?.({ highlights: values })} />
        ) : (
          <ul>
            {currentContent.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
