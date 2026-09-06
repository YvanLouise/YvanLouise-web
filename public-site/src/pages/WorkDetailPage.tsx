import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { ApiError } from "@shared/lib/apiError";
import { getWorkTypeLabel } from "@shared/lib/workLabels";
import { hasText, resolveMediaUrl } from "@shared/lib/workMedia";
import { displayWorkDate, relatedWorks, safeWorkLink, workGallerySources, workListReturnTo, workReadingMinutes } from "@shared/lib/workDetail";
import type { Work } from "@shared/types";
import { loadWorkDetail } from "../lib/workDetailData";
import { WorkGallery } from "../components/WorkGallery";
import { WorkCover, WorkDetailJump, WorkDetailOutline, WorkDetailText } from "../components/WorkDetailContent";
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
  const [manualLink, setManualLink] = useState("");
  const tabsRef = useRef<HTMLDivElement>(null);
  const returnTo = workListReturnTo(location.state?.returnTo);

  useEffect(() => {
    const controller = new AbortController();
    setWork(null);
    setAllWorks([]);
    setError(null);
    setNotFound(false);
    setShareStatus("");
    setManualLink("");
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

  useEffect(() => {
    if (!work) return;
    const description = document.querySelector('meta[name="description"]');
    const previous = description?.getAttribute("content") ?? "";
    description?.setAttribute("content", (work.summary || work.detailIntro || `${work.title} · ${getWorkTypeLabel(work.type, uiText)}`).slice(0, 180));
    return () => { description?.setAttribute("content", previous); };
  }, [work, uiText]);

  useEffect(() => {
    if (!work || !location.hash) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [work, location.hash]);

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
  const sections = useMemo(() => work?.detailSections.filter(section => hasText(section.title) && hasText(section.body)) ?? [], [work]);
  const outline = useMemo(() => [
    { id: "work-content", label: "封面与图集" },
    ...(featureItems.length ? [{ id: "work-features", label: copy.featureTitle }] : []),
    ...(tabs.length ? [{ id: "work-story", label: "创作与体验" }] : []),
    ...sections.map((section, index) => ({ id: `work-section-${index + 1}`, label: section.title })),
    ...(recommendations.length ? [{ id: "work-related", label: "继续探索" }] : [])
  ], [tabs, sections, recommendations.length, featureItems.length, copy.featureTitle]);

  function selectTab(id: string): void {
    setParams(previous => { const next = new URLSearchParams(previous); next.set("section", id); return next; }, { replace: true, state: location.state });
    setShareStatus("");
    setManualLink("");
  }

  async function copyLink(): Promise<void> {
    if (sharing) return;
    setSharing(true);
    setManualLink("");
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("作品链接已复制，可直接分享当前内容标签。");
    } catch { setShareStatus("自动复制不可用，请选中下方链接手动复制。"); setManualLink(window.location.href); }
    finally { setSharing(false); }
  }

  async function shareWork(): Promise<void> {
    if (!work || sharing) return;
    setSharing(true);
    setShareStatus("");
    try {
      await navigator.share({ title: work.title, text: work.summary || work.title, url: window.location.href });
      setShareStatus("作品链接已分享。");
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === "AbortError")) {
        setShareStatus("分享暂时不可用，可复制作品链接。");
      }
    } finally { setSharing(false); }
  }

  if (!workId || error) return <section className="status-card stack detail-status" role="alert">
    <span className="detail-eyebrow">{notFound || !workId ? "404 / WORK NOT FOUND" : "CONNECTION ERROR"}</span>
    <h1>{notFound || !workId ? copy.notFoundTitle : "作品暂时无法加载"}</h1>
    <p>{error ?? copy.notFoundDescription}</p>
    <div className="cta-row">{!notFound && workId ? <button className="btn btn-primary" type="button" onClick={() => setRetry(value => value + 1)}>重新加载</button> : null}<Link className="btn btn-secondary" to={returnTo}>{copy.backToWorksLabel}</Link></div>
  </section>;
  if (!work) return <section className="status-card detail-loading stack" role="status" aria-busy="true"><span className="detail-eyebrow">WORK / LOADING</span><h1>{copy.loadingLabel}</h1><p className="meta">正在确认最新作品内容…</p><div className="detail-skeleton" aria-hidden="true" /></section>;

  const demoUrl = safeWorkLink(work.demoUrl);
  const repoUrl = safeWorkLink(work.repoUrl);
  const publishedDate = displayWorkDate(work.publishedAt);
  const readingMinutes = workReadingMinutes(work);
  const demoLabel = work.type === "music" ? "观看歌曲视频" : work.type === "animation" ? "观看完整正片" : work.type === "game" ? "体验游戏" : copy.demoLabel;
  const contentLink = `${location.pathname}${location.search}#work-content`;
  const sideInfo = [
    hasText(work.platform) ? { label: copy.platformLabel, value: work.platform!.trim() } : null,
    hasText(work.status) ? { label: copy.statusLabel, value: work.status!.trim() } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const hasSideCard = gallery.length > 0 || sideInfo.length > 0 || demoUrl || repoUrl;

  return <div className="work-detail-page" id="work-top">
    <nav className="detail-breadcrumb" aria-label="面包屑导航"><Link to="/">首页</Link><span aria-hidden="true">/</span><Link to={returnTo}>{returnTo === "/works" ? copy.backToWorksLabel : "返回筛选结果"}</Link><span aria-hidden="true">/</span><span aria-current="page">{work.title}</span></nav>
    <section className={`hero work-detail-hero ${hasSideCard ? "" : "detail-full-width"}`}>
      <div className="stack">
        <span className="detail-eyebrow">SELECTED WORK / {work.type.toUpperCase()}</span>
        <div className="detail-meta"><Link className="badge" to={`/works?type=${work.type}`}>{getWorkTypeLabel(work.type, uiText)}</Link>{publishedDate ? <time dateTime={work.publishedAt} className="meta">发布于 {publishedDate}</time> : null}{readingMinutes ? <span className="meta">约 {readingMinutes} 分钟阅读</span> : null}</div>
        <h1 tabIndex={-1}>{work.title}</h1>
        {hasText(work.summary) ? <p className="detail-prose">{work.summary}</p> : null}
        {hasText(work.detailIntro) ? <p className="meta work-detail-intro detail-prose">{work.detailIntro}</p> : null}
        <div className="cta-row detail-primary-actions">
          {demoUrl ? <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{demoLabel} <span aria-hidden="true">↗</span><span className="sr-only">（在新窗口打开）</span></a> : null}
          <Link className="btn btn-secondary" to={contentLink} state={location.state} replace>查看作品内容 ↓</Link>
        </div>
        <div className="detail-share-row"><button className="detail-text-button" type="button" disabled={sharing} onClick={() => void copyLink()}>复制作品链接</button>{typeof navigator.share === "function" ? <button className="detail-text-button" type="button" disabled={sharing} onClick={() => void shareWork()}>分享作品 ↗</button> : null}</div>
        <p className="meta detail-share-status" role="status">{shareStatus}</p>
        {manualLink ? <label className="detail-manual-link">作品链接<input readOnly value={manualLink} onFocus={event => event.currentTarget.select()} /></label> : null}
      </div>
      {hasSideCard ? <aside className="panel work-detail-sidecard stack" aria-label="作品信息">
        {gallery[0] ? <Link className="detail-hero-cover" to={contentLink} state={location.state} replace aria-label={`查看${work.title}封面与图集`}><WorkCover key={gallery[0]} src={gallery[0]} title={work.title} /></Link> : null}
        <div className="gallery-toolbar"><h2>作品信息</h2><span className="detail-eyebrow">OVERVIEW</span></div>
        <dl className="work-detail-sidegrid">{sideInfo.map(item => <div key={item.label}><dt className="meta">{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
        {demoUrl || repoUrl ? <div className="detail-resource-links">{demoUrl ? <a href={demoUrl} target="_blank" rel="noopener noreferrer"><span className="meta">作品发布于</span><strong>{new URL(demoUrl).hostname} ↗</strong><span className="sr-only">（在新窗口打开）</span></a> : null}{repoUrl ? <a href={repoUrl} target="_blank" rel="noopener noreferrer"><strong>{copy.repoLabel} ↗</strong><span className="sr-only">（在新窗口打开）</span></a> : null}</div> : null}
      </aside> : null}
    </section>

    <WorkDetailJump items={outline} />
    <section className="section work-detail-layout">
      <div className="work-detail-main stack">
        <section id="work-content" tabIndex={-1} className="detail-anchor"><WorkGallery key={work.id} images={gallery} title={work.title} /></section>
        {featureItems.length ? <article id="work-features" tabIndex={-1} className="panel stack detail-anchor detail-features"><div className="gallery-toolbar"><h2>{copy.featureTitle}</h2><span className="detail-eyebrow">HIGHLIGHTS</span></div><ul className="detail-chip-list">{featureItems.map(item => <li key={item}>{item}</li>)}</ul></article> : null}
        {activeTab ? <article id="work-story" tabIndex={-1} className="panel stack detail-text-panel detail-anchor">
          <div className="gallery-toolbar"><h2>创作与体验</h2><span className="detail-eyebrow">BEHIND THE WORK</span></div>
          <div ref={tabsRef} className="work-tab-row" role="tablist" aria-label="作品详情标签" onKeyDown={event => {
            const index = tabs.findIndex(tab => tab.id === activeTab.id);
            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault(); selectTab(tabs[next].id);
            (tabsRef.current?.children[next] as HTMLButtonElement)?.focus();
          }}>
            {tabs.map(tab => <button key={tab.id} id={`tab-${tab.id}`} role="tab" type="button" aria-selected={activeTab.id === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab.id === tab.id ? 0 : -1} className={activeTab.id === tab.id ? "active" : ""} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}
          </div>
          {tabs.map(tab => <div key={tab.id} id={`panel-${tab.id}`} role="tabpanel" hidden={activeTab.id !== tab.id} aria-labelledby={`tab-${tab.id}`} tabIndex={0} className="work-detail-copy">{tab.id === "interaction" ? <ol className="detail-step-list">{interactionItems.map(item => <li key={item}><WorkDetailText text={item} /></li>)}</ol> : <WorkDetailText text={tab.content} />}</div>)}
        </article> : null}
        {sections.length ? <section className="detail-section-grid" aria-label="更多作品细节">{sections.map((section, index) => <article id={`work-section-${index + 1}`} tabIndex={-1} className="panel stack detail-anchor detail-article" key={`${section.title}-${index}`}><span className="detail-eyebrow">DETAIL / {String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2><WorkDetailText text={section.body} /></article>)}</section> : null}
      </div>
      <aside className="work-detail-sidebar stack">
        <WorkDetailOutline items={outline} />
        <article className="panel stack"><h2>{copy.feedbackTitle}</h2><p className="meta">{copy.feedbackDescription}</p><Link className="btn btn-secondary" to="/contact">{copy.contactButtonLabel}</Link></article>
      </aside>
    </section>
    {recommendations.length ? <section id="work-related" tabIndex={-1} className="section stack detail-anchor" aria-labelledby="related-title"><div className="gallery-toolbar"><div className="stack"><span className="detail-eyebrow">MORE TO DISCOVER</span><h2 id="related-title">继续探索</h2></div><Link to={returnTo}>返回作品列表 →</Link></div><div className="detail-related-grid">{recommendations.map(item => <Link key={item.id} className="detail-related-card" to={`/works/${encodeURIComponent(item.id)}`} state={{ returnTo }}>
      <WorkCover src={workGallerySources(item)[0] ? resolveMediaUrl(workGallerySources(item)[0]) : undefined} title={item.title} />
      <div className="stack detail-related-body"><div className="detail-meta"><span className="badge">{getWorkTypeLabel(item.type, uiText)}</span>{item.type === work.type ? <span className="meta">同类作品</span> : null}</div><h3>{item.title}</h3>{hasText(item.summary) ? <p className="meta">{item.summary}</p> : null}<span className="detail-related-action">{uiText.works.detailButtonLabel} <span aria-hidden="true">↗</span></span></div>
    </Link>)}</div></section> : null}
    <nav className="detail-bottom-nav" aria-label="详情页底部导航"><Link to={returnTo}>← {copy.backToWorksLabel}</Link><button className="detail-text-button" type="button" onClick={() => { window.scrollTo({ top: 0, behavior: "auto" }); document.querySelector<HTMLHeadingElement>(".work-detail-hero h1")?.focus({ preventScroll: true }); }}>回到顶部 ↑</button></nav>
  </div>;
}
