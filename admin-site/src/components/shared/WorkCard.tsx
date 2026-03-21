import { Link } from "react-router-dom";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { getWorkTypeLabel } from "../../lib/workLabels";
import { hasText, resolveWorkCoverUrl } from "../../lib/workMedia";
import { Work } from "../../types";

interface WorkCardProps {
  work: Work;
  interactive?: boolean;
  actionLabel?: string;
}

export function WorkCard({ work, interactive = true, actionLabel }: WorkCardProps): JSX.Element {
  const settings = useSiteSettings();
  const uiText = settings.uiText;
  const buttonLabel = actionLabel ?? uiText.works.detailButtonLabel;

  return (
    <article className="card">
      <img src={resolveWorkCoverUrl(work.coverUrl)} alt={`${work.title} 封面图`} style={{ aspectRatio: "16 / 10", objectFit: "cover" }} />
      <div className="card-body stack">
        <span className="badge">{getWorkTypeLabel(work.type, uiText)}</span>
        <h3 style={{ margin: 0 }}>{work.title}</h3>
        {hasText(work.summary) ? <p className="meta" style={{ margin: 0 }}>{work.summary}</p> : null}
        {interactive ? (
          <Link className="btn btn-secondary" to={`/works/${work.id}`}>
            {buttonLabel}
          </Link>
        ) : (
          <button type="button" className="btn btn-secondary btn-static-preview">
            {buttonLabel}
          </button>
        )}
      </div>
    </article>
  );
}
