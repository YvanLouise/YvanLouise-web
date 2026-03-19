import { FormEvent, useState } from "react";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { submitReview } from "../../lib/api";

interface ReviewFormProps {
  workId: string;
}

export function ReviewForm({ workId }: ReviewFormProps): JSX.Element {
  const { uiText } = useSiteSettings();
  const copy = uiText.review;
  const [rating, setRating] = useState(5);
  const [visitorName, setVisitorName] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      await submitReview(workId, {
        rating,
        visitorName: visitorName.trim() || undefined,
        comment: comment.trim()
      });

      setStatus(copy.successMessage);
      setComment("");
      setVisitorName("");
      setRating(5);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel stack" aria-labelledby="review-form-title">
      <h3 id="review-form-title" style={{ margin: 0 }}>{copy.title}</h3>
      <p className="notice" role="note">{copy.note}</p>

      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="review-rating">
          {copy.ratingLabel}
          <select id="review-rating" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} 星
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="review-name">
          {copy.visitorNameLabel}
          <input
            id="review-name"
            value={visitorName}
            onChange={(event) => setVisitorName(event.target.value)}
            placeholder={copy.visitorNamePlaceholder}
            maxLength={80}
          />
        </label>

        <label htmlFor="review-comment">
          {copy.commentLabel}
          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={copy.commentPlaceholder}
            required
            minLength={5}
            maxLength={1200}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? copy.submittingLabel : copy.submitLabel}
        </button>
      </form>

      {status ? <p className="notice" role="status">{status}</p> : null}
    </section>
  );
}
