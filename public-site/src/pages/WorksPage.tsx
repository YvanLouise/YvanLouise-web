import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { filterWorks, parseWorkFilter, workTypes, WorkSort } from "@shared/lib/workSearch";
import { MusicPreviewPanel } from "@shared/components/shared/MusicPreviewPanel";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { getWorks } from "@shared/lib/api";
import { readCachedWorks } from "@shared/lib/siteCache";
import { hasText, resolveWorkCoverUrl } from "@shared/lib/workMedia";
import { getWorkTypeLabel } from "@shared/lib/workLabels";
import { Work, WorkType } from "@shared/types";

export function WorksPage(): JSX.Element {
  const settings = useSiteSettings();
  const [works, setWorks] = useState<Work[]>(() => readCachedWorks() ?? []);
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseWorkFilter(searchParams.get("type"));
  const query = searchParams.get("q") ?? "";
  const sort: WorkSort = searchParams.get("sort") === "title" ? "title" : searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  function updateSearch(key: string, value: string, replace = false): void {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (!value || value === "all" || value === "newest") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace });
  }
  const [hasResolvedWorks, setHasResolvedWorks] = useState<boolean>(() => readCachedWorks() !== null);

  useEffect(() => {
    void getWorks()
      .then((response) => {
        setWorks(response);
        setHasResolvedWorks(true);
      })
      .catch(() => setHasResolvedWorks(true));
  }, []);

  const copy = settings.uiText.works;
  const filters: Array<{ id: "all" | WorkType; label: string; summary: string }> = useMemo(
    () => [
      { id: "all", label: copy.allLabel, summary: copy.allSummary },
      { id: "music", label: copy.musicLabel, summary: copy.musicSummary },
      { id: "software", label: copy.softwareLabel, summary: copy.softwareSummary },
      { id: "game", label: copy.gameLabel, summary: copy.gameSummary },
      { id: "animation", label: copy.animationLabel, summary: copy.animationSummary }
    ],
    [copy]
  );

  const categoryCopy: Record<WorkType, { title: string; summary: string }> = useMemo(
    () => ({
      music: { title: copy.musicTitle, summary: copy.musicSummary },
      software: { title: copy.softwareTitle, summary: copy.softwareSummary },
      game: { title: copy.gameTitle, summary: copy.gameSummary },
      animation: { title: copy.animationTitle, summary: copy.animationSummary }
    }),
    [copy]
  );

  const visibleTypes = useMemo(
    () => (filter === "all" ? (["music", "software", "game", "animation"] as WorkType[]) : [filter]),
    [filter]
  );

  const matchingWorks = useMemo(() => filterWorks(works, filter, query, sort), [works, filter, query, sort]);
  const groups = useMemo(() => Object.fromEntries(workTypes.map((type) => [type, matchingWorks.filter((work) => work.type === type)])) as Record<WorkType, Work[]>, [matchingWorks]);
  const hasVisibleWorks = matchingWorks.length > 0;

  return (
    <>
      <section className="hero">
        <span className="badge">{settings.uiText.pageBadges.works}</span>
        <h1>{copy.heroTitle}</h1>
        <p>{copy.heroDescription}</p>
      </section>

      <section className="section panel works-summary-panel">
        <div className="tag-filter" role="group" aria-label="作品分类筛选">
          {filters.map((item) => (
            <button key={item.id} className={filter === item.id ? "active" : ""} type="button" aria-pressed={filter === item.id} onClick={() => updateSearch("type", item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="works-tools">
          <label className="stack" htmlFor="work-search">搜索作品
            <input id="work-search" type="search" placeholder="标题、关键词、平台…" value={query} maxLength={200} onChange={(event) => updateSearch("q", event.target.value, true)} />
          </label>
          <label className="stack" htmlFor="work-sort">排序
            <select id="work-sort" value={sort} onChange={(event) => updateSearch("sort", event.target.value)}>
              <option value="newest">最新发布</option><option value="oldest">最早发布</option><option value="title">作品名称</option>
            </select>
          </label>
          {query || filter !== "all" ? <button type="button" className="btn btn-secondary" onClick={() => setSearchParams({})}>重置筛选</button> : null}
        </div>
        <p className="meta" role="status">{hasResolvedWorks ? `找到 ${matchingWorks.length} 个作品` : "正在加载作品…"}</p>
        <p className="meta" style={{ margin: 0 }}>
          {filters.find((item) => item.id === filter)?.summary}
        </p>
      </section>

      <section className="section works-board">
        {!hasResolvedWorks && works.length === 0 ? (
          <section className="panel status-card" aria-live="polite">
            作品加载中...
          </section>
        ) : null}

        {hasResolvedWorks && !hasVisibleWorks ? (
          <section className="panel stack">
            <h2 style={{ margin: 0 }}>{query ? "没有匹配的作品" : copy.emptyTitle}</h2>
            <p className="meta" style={{ margin: 0 }}>{query ? "试试更短的关键词，或重置筛选查看全部作品。" : copy.emptyDescription}</p>
          </section>
        ) : null}

        {visibleTypes.map((type) => {
          const groupWorks = groups[type];
          const currentCategory = categoryCopy[type];

          if (groupWorks.length === 0) {
            return null;
          }

          return (
            <section className="category-section" key={type}>
              {type === "music" ? <MusicPreviewPanel clips={settings.musicPreviewClips} /> : null}

              <header className="category-header">
                <div>
                  <span className="badge">{getWorkTypeLabel(type, settings.uiText)}</span>
                  <h2>{currentCategory.title}</h2>
                  <p className="meta" style={{ marginBottom: 0 }}>{currentCategory.summary}</p>
                </div>
                <strong className="category-count">{groupWorks.length} {copy.categoryCountSuffix}</strong>
              </header>

              <div className="category-list">
                {groupWorks.map((work) => (
                  <article className="work-list-item panel" key={work.id}>
                    <img className="work-list-cover" src={resolveWorkCoverUrl(work.coverUrl)} alt={`${work.title} 封面图`} loading="lazy" decoding="async" />

                    <div className="work-list-content">
                      <div className="work-list-head">
                        <div>
                          <h3 style={{ margin: 0 }}>{work.title}</h3>
                          <p className="meta" style={{ margin: 0 }}>
                            {getWorkTypeLabel(work.type, settings.uiText)} · 发布于 {work.publishedAt}
                          </p>
                        </div>
                        <span className="badge">{copy.listBadge}</span>
                      </div>

                      {hasText(work.summary) ? <p className="work-list-summary">{work.summary}</p> : null}

                      <div className="work-list-meta">
                        {work.platform ? <span>{work.platform}</span> : null}
                        {work.status ? <span>{work.status}</span> : null}
                      </div>

                      <div className="work-list-actions">
                        <Link className="btn btn-primary" to={`/works/${encodeURIComponent(work.id)}`} state={{ returnTo: `/works${searchParams.size ? `?${searchParams}` : ""}` }}>
                          {copy.detailButtonLabel}
                        </Link>
                        {work.demoUrl ? (
                          <a className="btn btn-secondary" href={work.demoUrl} target="_blank" rel="noreferrer">
                            {work.type === "music" ? "观看歌曲视频 ↗" : work.type === "animation" ? "观看正片 ↗" : copy.demoButtonLabel}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </>
  );
}
