import { ContactForm } from "@shared/components/shared/ContactForm";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";

export function ContactPage(): JSX.Element {
  const { uiText } = useSiteSettings();
  const copy = uiText.contact;

  return (
    <>
      <section className="hero">
        <span className="badge">{uiText.pageBadges.contact}</span>
        <h1>{copy.heroTitle}</h1>
        <p>{copy.heroDescription}</p>
      </section>

      <section className="section">
        <ContactForm />
      </section>
    </>
  );
}
