'use client';
import type { Catalog } from '@/lib/domain';
import { useWebsiteCopy } from './website-copy';

export function SalonTestimonials({ catalog: initial }: { catalog: Catalog }) {
  const { catalog, t } = useWebsiteCopy(initial);
  const real = catalog.reviews ?? [];
  const samples = !real.length && process.env.NODE_ENV === 'development';
  if (!real.length && !samples) return null;
  const reviews = samples
    ? [
        'Un moment pour moi, une belle mise en beauté et beaucoup de douceur.',
        'J’ai aimé pouvoir réunir mes prestations dans une seule demande.',
        'Une jolie parenthèse beauté à partager.',
      ].map((body, i) => ({
        id: `example-${i}`,
        body,
        name: `Exemple ${i + 1}`,
        rating: null,
      }))
    : real;
  return (
    <section className="salon-testimonials premium-section fatu-container">
      <div className="premium-section-head">
        <div>
          <span className="fatu-eyebrow">{t('aboutPage.words')}</span>
          <h2>{t('home.reviews.title')}</h2>
        </div>
      </div>
      {samples && (
        <p className="salon-example-notice" role="note">
          Exemples fictifs de mise en page — aperçu de développement uniquement.
          Ces textes ne sont pas des avis clients et ne sont pas publiés en
          production.
        </p>
      )}
      <div className="fatu-review-grid">
        {reviews.slice(0, 6).map((review) => (
          <figure key={review.id}>
            <span className="salon-quote-mark" aria-hidden>
              “
            </span>
            <blockquote>{review.body}</blockquote>
            <figcaption>
              {review.name}
              {review.rating !== null && <span> · {review.rating}/5</span>}
              {samples && <small>Exemple fictif</small>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
