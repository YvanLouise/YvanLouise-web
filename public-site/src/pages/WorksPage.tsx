import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  const [filter, setFilter] = useState<"all" | WorkType>("all");
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

  const hasVisibleWorks = visibleTypes.some((type) => works.some((work) => work.type === type));

  return (
    <>
      <section className="hero">
        <span className="badge">{settings.uiText.pageBadges.works}</span>
        <h1>{copy.heroTitle}</h1>
        <p>{copy.heroDescription}</p>
      </section>

      <section className="section panel works-summary-panel">
        <div className="tag-filter" role="tablist" aria-label="作品分类筛选">
          {filters.map((item) => (
            <button key={item.id} className={filter === item.id ? "active" : ""} type="button" onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <p className="meta" style={{ margin: 0 }}>
          {filters.find((item) => item.id === filter)?.summary}
        </p>
      </section>

      <section className="section works-board">
        {hasResolvedWorks && !hasVisibleWorks ? (
          <section className="panel stack">
            <h2 style={{ margin: 0 }}>{copy.emptyTitle}</h2>
            <p className="meta" style={{ margin: 0 }}>{copy.emptyDescription}</p>
          </section>
        ) : null}

        {visibleTypes.map((type) => {
          const groupWorks = works.filter((work) => work.type === type);
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
                    <img className="work-list-cover" src={resolveWorkCoverUrl(work.coverUrl)} alt={`${work.title} 封面图`} />

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
                        {work.featureList.length ? <span>{work.featureList.length} 个亮点</span> : null}
                        {work.galleryImages.length ? <span>{work.galleryImages.length} 张图集</span> : null}
                      </div>

                      <div className="work-list-actions">
                        <Link className="btn btn-primary" to={`/works/${work.id}`}>
                          {copy.detailButtonLabel}
                        </Link>
                        {work.demoUrl ? (
                          <a className="btn btn-secondary" href={work.demoUrl} target="_blank" rel="noreferrer">
                            {copy.demoButtonLabel}
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
