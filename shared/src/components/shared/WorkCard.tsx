import { Link } from "react-router-dom";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { getWorkTypeLabel } from "../../lib/workLabels";
import { hasText, resolveWorkCoverUrl } from "../../lib/workMedia";
import { Work } from "../../types";

export function WorkCard({ work }: { work: Work }): JSX.Element {
  const settings = useSiteSettings();
  const uiText = settings.uiText;

  return (
    <article className="card">
      <img
        src={resolveWorkCoverUrl(work.coverUrl)}
        alt={`${work.title} 封面图`}
        loading="lazy"
        decoding="async"
        style={{ aspectRatio: "16 / 10", objectFit: "cover" }}
      />
      <div className="card-body stack">
        <span className="badge">{getWorkTypeLabel(work.type, uiText)}</span>
        <h3 style={{ margin: 0 }}>{work.title}</h3>
        {hasText(work.summary) ? <p className="meta" style={{ margin: 0 }}>{work.summary}</p> : null}
        <Link className="btn btn-secondary" to={`/works/${work.id}`}>
          {uiText.works.detailButtonLabel}
        </Link>
      </div>
    </article>
  );
}
