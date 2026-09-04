import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { getWorkById } from "@shared/lib/api";
import { readCachedWorkById } from "@shared/lib/siteCache";
import { getWorkTypeLabel } from "@shared/lib/workLabels";
import { hasText, resolveMediaUrl, resolveWorkCoverUrl } from "@shared/lib/workMedia";
import { Work } from "@shared/types";

type DetailTabId = "background" | "process" | "result" | "interaction";

export function WorkDetailPage(): JSX.Element {
  const { workId } = useParams();
  const { uiText } = useSiteSettings();
  const copy = uiText.workDetail;
  const [work, setWork] = useState<Work | null>(() => readCachedWorkById(workId));
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabId>("background");
  const [activeImage, setActiveImage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    setWork(readCachedWorkById(workId));
    setError(null);
    if (!workId) {
      return;
    }

    void getWorkById(workId)
      .then((response) => {
        if (!mounted) return;
        setWork(response);
        setError(null);
        setActiveImage(0);
        setActiveTab("background");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : copy.notFoundDescription);
      });
    return () => { mounted = false; };
  }, [copy.notFoundDescription, workId, retry]);

  const gallery = useMemo(() => {
    if (!work) {
      return [] as string[];
    }

    return Array.from(new Set([work.coverUrl, ...work.galleryImages].map((item) => resolveMediaUrl(item)).filter(Boolean)));
  }, [work]);

  const interactionItems = useMemo(
    () => (work?.interactionPoints ?? []).map((item) => item.trim()).filter(Boolean),
    [work]
  );

  const featureItems = useMemo(
    () => (work?.featureList ?? []).map((item) => item.trim()).filter(Boolean),
    [work]
  );

  const detailSections = useMemo(
    () => (work?.detailSections ?? []).filter((section) => hasText(section.title) && hasText(section.body)),
    [work]
  );

  const detailTabs = useMemo(() => {
    if (!work) {
      return [] as Array<{ id: DetailTabId; label: string; content: string }>;
    }

    const tabs: Array<{ id: DetailTabId; label: string; content: string }> = [];

    if (hasText(work.background)) {
      tabs.push({ id: "background", label: copy.backgroundTabLabel, content: work.background.trim() });
    }

    if (hasText(work.process)) {
      tabs.push({ id: "process", label: copy.processTabLabel, content: work.process.trim() });
    }

    if (hasText(work.result)) {
      tabs.push({ id: "result", label: copy.resultTabLabel, content: work.result.trim() });
    }

    if (interactionItems.length) {
      tabs.push({ id: "interaction", label: copy.interactionTabLabel, content: interactionItems.join("\n") });
    }

    return tabs;
  }, [copy.backgroundTabLabel, copy.interactionTabLabel, copy.processTabLabel, copy.resultTabLabel, interactionItems, work]);

  useEffect(() => {
    if (detailTabs.length && !detailTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(detailTabs[0].id);
    }
  }, [activeTab, detailTabs]);

  useEffect(() => {
    if (activeImage >= gallery.length) {
      setActiveImage(0);
    }
  }, [activeImage, gallery.length]);

  if (!workId || (!work && error)) {
    return (
      <section className="status-card stack">
        <h1>{copy.notFoundTitle}</h1>
        <p>{error ?? copy.notFoundDescription}</p>
        <button className="btn btn-primary" type="button" onClick={() => setRetry((value) => value + 1)}>重新加载</button>
        <Link className="btn btn-secondary" to="/works">
          {copy.backToWorksLabel}
        </Link>
      </section>
    );
  }

  if (!work) {
    return <section className="status-card">{copy.loadingLabel}</section>;
  }

  const activeTabContent = detailTabs.find((tab) => tab.id === activeTab)?.content ?? "";
  const sideInfo = [
    hasText(work.platform) ? { label: copy.platformLabel, value: work.platform!.trim() } : null,
    hasText(work.status) ? { label: copy.statusLabel, value: work.status!.trim() } : null,
    gallery.length ? { label: copy.galleryLabel, value: `${gallery.length} 张` } : null,
    featureItems.length ? { label: copy.featuresLabel, value: `${featureItems.length} 项` } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const hasSideCard = sideInfo.length > 0 || hasText(work.demoUrl) || hasText(work.repoUrl);

  return (
    <>
      <nav className="detail-breadcrumb" aria-label="面包屑导航">
        <Link to="/works">{copy.backToWorksLabel}</Link><span aria-hidden="true"> / </span><span>{work.title}</span>
        <button className="btn btn-secondary" type="button" onClick={() => {
          if (!navigator.clipboard) { setShareStatus("请复制浏览器地址栏中的链接。"); return; }
          void navigator.clipboard.writeText(window.location.href).then(() => setShareStatus("链接已复制"), () => setShareStatus("复制失败，请复制浏览器地址栏中的链接。"));
        }}>复制作品链接</button><span role="status">{shareStatus}</span>
      </nav>
      <section className="hero work-detail-hero">
        <div className="stack">
          <span className="badge">{getWorkTypeLabel(work.type, uiText)}</span>
          <h1>{work.title}</h1>
          {hasText(work.summary) ? <p>{work.summary}</p> : null}
          {hasText(work.detailIntro) ? <p className="meta work-detail-intro">{work.detailIntro}</p> : null}
        </div>

        {hasSideCard ? (
          <aside className="panel work-detail-sidecard stack">
            {sideInfo.length ? (
              <div className="work-detail-sidegrid">
                {sideInfo.map((item) => (
                  <div key={item.label}>
                    <span className="meta">{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="cta-row">
              {hasText(work.demoUrl) ? (
                <a href={work.demoUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  {copy.demoLabel}
                </a>
              ) : null}
              {hasText(work.repoUrl) ? (
                <a href={work.repoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  {copy.repoLabel}
                </a>
              ) : null}
            </div>
          </aside>
        ) : null}
      </section>

      <section className="section work-detail-layout">
        <div className="work-detail-main stack">
          {gallery.length ? (
            <article className="panel stack work-gallery-panel">
              <img
                src={gallery[activeImage] ?? resolveWorkCoverUrl(work.coverUrl)}
                alt={`${work.title} 详情图 ${activeImage + 1}`}
                className="work-detail-hero-image"
                decoding="async"
              />
              {gallery.length > 1 ? (
                <div className="work-gallery-strip" role="group" aria-label="作品图集切换">
                  {gallery.map((image, index) => (
                    <button key={`${image}-${index}`} type="button" aria-pressed={index === activeImage} className={index === activeImage ? "active" : ""} onClick={() => setActiveImage(index)}>
                      <img src={image} alt={`${work.title} 缩略图 ${index + 1}`} loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ) : null}

          {detailTabs.length ? (
            <article className="panel stack">
              <div className="work-tab-row" role="group" aria-label="作品详情标签">
                {detailTabs.map((tab) => (
                  <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="work-detail-copy">
                {activeTabContent.split("\n").filter((paragraph) => paragraph.trim()).map((paragraph, index) => (
                  <p key={`${activeTab}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </article>
          ) : null}

          {detailSections.length ? (
            <section className="detail-section-grid">
              {detailSections.map((section) => (
                <article className="panel stack" key={`${section.title}-${section.body}`}>
                  <h2 style={{ margin: 0 }}>{section.title}</h2>
                  <p style={{ margin: 0 }}>{section.body}</p>
                </article>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="work-detail-sidebar stack">
          {featureItems.length ? (
            <article className="panel stack">
              <h2 style={{ margin: 0 }}>{copy.featureTitle}</h2>
              <ul className="detail-chip-list">
                {featureItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {interactionItems.length ? (
            <article className="panel stack">
              <h2 style={{ margin: 0 }}>{copy.interactionTitle}</h2>
              <ul className="detail-bullet-list">
                {interactionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ) : null}

          <article className="panel stack">
            <h2 style={{ margin: 0 }}>{copy.feedbackTitle}</h2>
            <p className="meta" style={{ margin: 0 }}>{copy.feedbackDescription}</p>
            <div className="cta-row">
              <Link className="btn btn-secondary" to="/contact">{copy.contactButtonLabel}</Link>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
