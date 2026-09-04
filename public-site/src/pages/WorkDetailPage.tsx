import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { ApiError } from "@shared/lib/apiError";
import { getWorkTypeLabel } from "@shared/lib/workLabels";
import { hasText, resolveMediaUrl } from "@shared/lib/workMedia";
import { displayWorkDate, relatedWorks, safeWorkLink, workGallerySources, workListReturnTo } from "@shared/lib/workDetail";
import type { Work } from "@shared/types";
import { loadWorkDetail } from "../lib/workDetailData";
import { WorkGallery } from "../components/WorkGallery";
import "../work-detail.css";

export function WorkDetailPage(): JSX.Element {
  const { workId } = useParams();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { uiText, siteTitle } = useSiteSettings();
  const copy = uiText.workDetail;
  const [work, setWork] = useState<Work | null>(null);
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retry, setRetry] = useState(0);
  const [shareStatus, setShareStatus] = useState("");
  const [sharing, setSharing] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const returnTo = workListReturnTo(location.state?.returnTo);

  useEffect(() => {
    const controller = new AbortController();
    setWork(null);
    setAllWorks([]);
    setError(null);
    setNotFound(false);
    setShareStatus("");
    if (workId) void loadWorkDetail(workId, controller.signal).then(data => {
      if (!controller.signal.aborted) { setWork(data.work); setAllWorks(data.works); }
    }).catch(reason => {
      if (controller.signal.aborted) return;
      setNotFound(reason instanceof ApiError && reason.status === 404);
      setError(reason instanceof Error ? reason.message : "暂时无法读取作品，请重试。");
    });
    return () => controller.abort();
  }, [workId, retry]);

  useEffect(() => {
    document.title = `${work?.title ?? (notFound ? "作品未找到" : "作品详情")} | ${siteTitle}`;
  }, [work?.title, siteTitle, notFound]);

  const gallery = useMemo(() => work ? [...new Set(workGallerySources(work).map(resolveMediaUrl))] : [], [work]);
  const featureItems = useMemo(() => [...new Set((work?.featureList ?? []).map(item => item.trim()).filter(Boolean))], [work]);
  const interactionItems = useMemo(() => [...new Set((work?.interactionPoints ?? []).map(item => item.trim()).filter(Boolean))], [work]);
  const recommendations = useMemo(() => work ? relatedWorks(allWorks, work) : [], [allWorks, work]);
  const tabs = useMemo(() => {
    if (!work) return [];
    return [
      { id: "background", label: copy.backgroundTabLabel, content: work.background },
      { id: "process", label: copy.processTabLabel, content: work.process },
      { id: "result", label: copy.resultTabLabel, content: work.result },
      { id: "interaction", label: copy.interactionTabLabel, content: interactionItems.join("\n") }
    ].filter(tab => hasText(tab.content));
  }, [work, copy, interactionItems]);
  const activeTab = tabs.find(tab => tab.id === params.get("section")) ?? tabs[0];

  function selectTab(id: string): void {
    setParams(previous => { const next = new URLSearchParams(previous); next.set("section", id); return next; }, { replace: true, state: location.state });
  }

  async function copyLink(): Promise<void> {
    if (sharing) return;
    setSharing(true);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("作品链接已复制，可直接分享当前内容标签。");
    } catch { setShareStatus("复制失败，请手动复制浏览器地址栏中的链接。"); }
    finally { setSharing(false); }
  }

  if (!workId || error) return <section className="status-card stack" role="alert">
    <h1>{notFound || !workId ? copy.notFoundTitle : "作品暂时无法加载"}</h1>
    <p>{error ?? copy.notFoundDescription}</p>
    <div className="cta-row"><button className="btn btn-primary" type="button" onClick={() => setRetry(value => value + 1)}>重新加载</button><Link className="btn btn-secondary" to={returnTo}>{copy.backToWorksLabel}</Link></div>
  </section>;
  if (!work) return <section className="status-card detail-loading" role="status" aria-busy="true"><h1>{copy.loadingLabel}</h1><p className="meta">正在确认最新作品内容…</p></section>;

  const demoUrl = safeWorkLink(work.demoUrl);
  const repoUrl = safeWorkLink(work.repoUrl);
  const publishedDate = displayWorkDate(work.publishedAt);
  const sideInfo = [
    hasText(work.platform) ? { label: copy.platformLabel, value: work.platform!.trim() } : null,
    hasText(work.status) ? { label: copy.statusLabel, value: work.status!.trim() } : null,
    gallery.length ? { label: copy.galleryLabel, value: `${gallery.length} 张` } : null,
    featureItems.length ? { label: copy.featuresLabel, value: `${featureItems.length} 项` } : null
  ].filter((item): item is { label: string; value: string } => item !== null);
  const hasSideCard = sideInfo.length > 0 || demoUrl || repoUrl;
  const sections = work.detailSections.filter(section => hasText(section.title) && hasText(section.body));

  return <div className="work-detail-page">
    <nav className="detail-breadcrumb" aria-label="面包屑导航"><Link to={returnTo}>{returnTo === "/works" ? copy.backToWorksLabel : "返回筛选结果"}</Link><span aria-hidden="true">/</span><span aria-current="page">{work.title}</span></nav>
    <section className={`hero work-detail-hero ${hasSideCard ? "" : "detail-full-width"}`}>
      <div className="stack">
        <div className="detail-meta"><Link className="badge" to={`/works?type=${work.type}`}>{getWorkTypeLabel(work.type, uiText)}</Link>{publishedDate ? <time dateTime={work.publishedAt} className="meta">发布于 {publishedDate}</time> : null}</div>
        <h1>{work.title}</h1>
        {hasText(work.summary) ? <p className="detail-prose">{work.summary}</p> : null}
        {hasText(work.detailIntro) ? <p className="meta work-detail-intro detail-prose">{work.detailIntro}</p> : null}
        <div className="cta-row"><button className="btn btn-secondary" type="button" disabled={sharing} onClick={() => void copyLink()}>{sharing ? "复制中…" : "复制作品链接"}</button><a className="btn btn-secondary" href="#work-content">查看作品内容 ↓</a></div>
        {shareStatus ? <p className="meta" role="status">{shareStatus}</p> : null}
      </div>
      {hasSideCard ? <aside className="panel work-detail-sidecard stack" aria-label="作品信息">
        <dl className="work-detail-sidegrid">{sideInfo.map(item => <div key={item.label}><dt className="meta">{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
        {demoUrl || repoUrl ? <div className="cta-row">{demoUrl ? <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{copy.demoLabel}<span className="sr-only">（在新窗口打开）</span></a> : null}{repoUrl ? <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">{copy.repoLabel}<span className="sr-only">（在新窗口打开）</span></a> : null}</div> : null}
      </aside> : null}
    </section>

    <section id="work-content" className="section work-detail-layout">
      <div className="work-detail-main stack">
        <WorkGallery key={work.id} images={gallery} title={work.title} />
        {activeTab ? <article className="panel stack detail-text-panel">
          <div ref={tabsRef} className="work-tab-row" role="tablist" aria-label="作品详情标签" onKeyDown={event => {
            const index = tabs.findIndex(tab => tab.id === activeTab.id);
            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault(); selectTab(tabs[next].id);
            (tabsRef.current?.children[next] as HTMLButtonElement)?.focus();
          }}>
            {tabs.map(tab => <button key={tab.id} id={`tab-${tab.id}`} role="tab" type="button" aria-selected={activeTab.id === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab.id === tab.id ? 0 : -1} className={activeTab.id === tab.id ? "active" : ""} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}
          </div>
          {tabs.map(tab => <div key={tab.id} id={`panel-${tab.id}`} role="tabpanel" hidden={activeTab.id !== tab.id} aria-labelledby={`tab-${tab.id}`} tabIndex={0} className="work-detail-copy detail-prose">{tab.id === "interaction" ? <ul className="detail-bullet-list">{interactionItems.map(item => <li key={item}>{item}</li>)}</ul> : <p>{tab.content.trim()}</p>}</div>)}
        </article> : !sections.length ? <article className="panel"><h2>关于这个作品</h2><p className="meta">更多制作细节正在整理中，欢迎通过联系入口交流。</p></article> : null}
        {sections.length ? <section className="detail-section-grid" aria-label="更多作品细节">{sections.map((section, index) => <article className="panel stack" key={`${section.title}-${index}`}><h2>{section.title}</h2><p className="detail-prose">{section.body}</p></article>)}</section> : null}
      </div>
      <aside className="work-detail-sidebar stack">
        {featureItems.length ? <article className="panel stack"><h2>{copy.featureTitle}</h2><ul className="detail-chip-list">{featureItems.map(item => <li key={item}>{item}</li>)}</ul></article> : null}
        <article className="panel stack"><h2>{copy.feedbackTitle}</h2><p className="meta">{copy.feedbackDescription}</p><Link className="btn btn-secondary" to="/contact">{copy.contactButtonLabel}</Link></article>
      </aside>
    </section>
    {recommendations.length ? <section className="section stack" aria-labelledby="related-title"><div className="gallery-toolbar"><h2 id="related-title">继续探索</h2><Link to={returnTo}>返回作品列表 →</Link></div><div className="detail-related-grid">{recommendations.map(item => <article key={item.id} className="panel stack"><span className="badge">{getWorkTypeLabel(item.type, uiText)}</span><h3><Link to={`/works/${encodeURIComponent(item.id)}`} state={{ returnTo }}>{item.title}</Link></h3>{hasText(item.summary) ? <p className="meta">{item.summary}</p> : null}<Link className="btn btn-secondary" to={`/works/${encodeURIComponent(item.id)}`} state={{ returnTo }}>{uiText.works.detailButtonLabel}<span className="sr-only">：{item.title}</span></Link></article>)}</div></section> : null}
  </div>;
}
