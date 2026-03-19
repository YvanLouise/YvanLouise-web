import { FormEvent, useState } from "react";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { submitMessage } from "../../lib/api";

export function ContactForm(): JSX.Element {
  const { uiText } = useSiteSettings();
  const copy = uiText.contact;
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      await submitMessage({
        name: name.trim(),
        contact: contact.trim(),
        subject: subject.trim(),
        body: body.trim()
      });

      setStatus(copy.successMessage);
      setName("");
      setContact("");
      setSubject("");
      setBody("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-grid panel" onSubmit={onSubmit} aria-label={copy.formAriaLabel}>
      <label htmlFor="contact-name">
        {copy.nameLabel}
        <input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
      </label>

      <label htmlFor="contact-way">
        {copy.contactLabel}
        <input
          id="contact-way"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder={copy.contactPlaceholder}
          required
          maxLength={120}
        />
      </label>

      <label htmlFor="contact-subject">
        {copy.subjectLabel}
        <input id="contact-subject" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={150} />
      </label>

      <label htmlFor="contact-body">
        {copy.bodyLabel}
        <textarea id="contact-body" value={body} onChange={(event) => setBody(event.target.value)} required minLength={10} maxLength={2000} />
      </label>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? copy.submittingLabel : copy.submitLabel}
      </button>

      {status ? (
        <p className={`notice ${status.includes("失败") ? "error" : ""}`} role="status">
          {status}
        </p>
      ) : null}
    </form>
  );
}
