import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

export function NotFoundPage(): JSX.Element {
  const { uiText } = useSiteSettings();
  const copy = uiText.notFound;

  return (
    <section className="status-card stack">
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>
      <Link to="/" className="btn btn-primary">
        {copy.buttonLabel}
      </Link>
    </section>
  );
}
