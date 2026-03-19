import { useEffect, useState } from "react";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { getSamplePage } from "@shared/data/sampleData";
import { getPage } from "@shared/lib/api";
import { readCachedPage } from "@shared/lib/siteCache";
import { PageContent } from "@shared/types";

export function AboutPage(): JSX.Element {
  const [content, setContent] = useState<PageContent>(() => readCachedPage("about") ?? getSamplePage("about"));
  const { uiText } = useSiteSettings();

  useEffect(() => {
    void getPage("about").then(setContent).catch(() => undefined);
  }, []);

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.about}</span>
        <h1>{content.title}</h1>
        <p>{content.hero}</p>
      </section>

      <section className="section panel stack">
        <p style={{ margin: 0 }}>{content.body}</p>
        <ul>
          {content.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
