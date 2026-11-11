'use client';
import Link from 'next/link';
import Image from 'next/image';
import { salonImage } from '@/lib/assets';
import type { Catalog } from '@/lib/domain';
import { useWebsiteCopy } from './website-copy';
import { FatuPhoto } from './fatu-photo';
import { ServiceCard } from './catalog';
import { FatuFaq } from './fatu-pages';
export function HomeExperience({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const { t, catalog } = useWebsiteCopy(initialCatalog);
  const featured = catalog.services.filter((s) => s.featured).slice(0, 3);
  return (
    <>
      <section className="fatu-hero fatu-container">
        <div className="fatu-hero-copy">
          <span className="fatu-eyebrow">{t('hero.eyebrow')}</span>
          <h1>{catalog.settings?.hero_title || t('brand.signature')}</h1>
          <p>{catalog.settings?.hero_subtitle || t('hero.body')}</p>
          <div className="fatu-actions">
            <Link className="fatu-button" href="/reservation">
              {t('nav.booking')} <span aria-hidden>↗</span>
            </Link>
            <Link className="fatu-text-link" href="/portfolio">
              {t('hero.portfolio')}
            </Link>
          </div>
          <small>{t('hero.note')}</small>
          <span className="fatu-hero-number" aria-hidden>
            01 — FATU
          </span>
        </div>
        {catalog.settings?.hero_image_path ? (
          <figure className="fatu-photo">
            <Image
              src={salonImage(catalog.settings.hero_image_path)}
              alt={catalog.settings.hero_title || t('brand.signature')}
              width={1400}
              height={1800}
              priority
              unoptimized
            />
          </figure>
        ) : (
          <FatuPhoto id="editorial-beauty" priority />
        )}
        <span className="fatu-hero-vertical" aria-hidden>
          BEAUTY IN EVERY DETAIL
        </span>
      </section>
      <div className="fatu-marquee" aria-hidden>
        <span>FATU MAKEUP ARTIST</span>
        <i>✧</i>
        <span>{t('brand.signature')}</span>
        <i>✧</i>
        <span>FATU MAKEUP ARTIST</span>
      </div>
      <section className="fatu-container fatu-section">
        <div className="fatu-section-heading">
          <div>
            <span className="fatu-eyebrow">01 / {t('nav.services')}</span>
            <h2>{t('home.services.title')}</h2>
          </div>
          <Link className="fatu-text-link" href="/services">
            {t('nav.services')} ↗
          </Link>
        </div>
        <p className="fatu-intro">{t('home.services.body')}</p>
        {featured.length ? (
          <div className="service-grid">
            {featured.map((s) => (
              <ServiceCard key={s.id} service={s} catalog={catalog} />
            ))}
          </div>
        ) : (
          <div className="fatu-service-editorial">
            <FatuPhoto id="artistry" />
            <div>
              <span className="fatu-eyebrow">FATU / MAKEUP</span>
              <h3>{t('brand.signature')}</h3>
              <p>{t('home.services.empty')}</p>
              <Link className="fatu-text-link" href="/services">
                {t('nav.services')} ↗
              </Link>
            </div>
          </div>
        )}
      </section>
      <section className="fatu-about-band">
        <div className="fatu-container fatu-split">
          <FatuPhoto id="brushes" />
          <div>
            <span className="fatu-eyebrow">02 / {t('nav.about')}</span>
            <h2>{t('home.about.title')}</h2>
            <p>{t('home.about.body')}</p>
            <Link className="fatu-text-link" href="/a-propos">
              {t('home.about.more')} ↗
            </Link>
          </div>
        </div>
      </section>
      <section className="fatu-container fatu-section">
        <div className="fatu-section-heading">
          <div>
            <span className="fatu-eyebrow">03 / {t('nav.portfolio')}</span>
            <h2>{t('home.portfolio.title')}</h2>
          </div>
          <Link className="fatu-text-link" href="/portfolio">
            {t('hero.portfolio')} ↗
          </Link>
        </div>
        <div className="fatu-portfolio-teaser">
          <FatuPhoto id="editorial-colour" />
          <div>
            <span className="fatu-eyebrow">{t('image.editorial')}</span>
            <p>{t('portfolio.empty')}</p>
            <Link
              className="fatu-text-link"
              href="https://www.instagram.com/fatu_makeupartist/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('home.follow')} ↗
            </Link>
          </div>
        </div>
      </section>
      <section className="fatu-container fatu-section fatu-care">
        <span className="fatu-eyebrow">04 / FATU</span>
        <h2>{t('home.why.title')}</h2>
        <div>
          {['personal', 'clear', 'follow'].map((key, i) => (
            <article key={key}>
              <span>0{i + 1}</span>
              <h3>{t(`home.why.${key}`)}</h3>
              <p>{t(`home.why.${key}Body`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="fatu-container fatu-section fatu-reviews">
        <span className="fatu-eyebrow">{t('admin.reviews')}</span>
        <h2>{t('home.reviews.title')}</h2>
        {catalog.reviews?.length ? (
          <div className="fatu-review-grid">
            {catalog.reviews.map((review) => (
              <figure key={review.id}>
                <blockquote>{review.body}</blockquote>
                <figcaption>
                  {review.name}
                  {review.rating !== null && (
                    <span aria-label={String(review.rating)}>
                      {' '}
                      · {review.rating}/5
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="fatu-empty">{t('home.reviews.empty')}</p>
        )}
      </section>
      <section className="fatu-container fatu-section">
        <FatuFaq catalog={catalog} />
      </section>
      <section className="fatu-cta">
        <span className="fatu-eyebrow">FATU MAKEUP ARTIST</span>
        <h2>{t('home.cta.title')}</h2>
        <p>{t('home.cta.body')}</p>
        <Link className="fatu-button" href="/reservation">
          {t('nav.booking')} ↗
        </Link>
        <small>{t('common.notConfirmed')}</small>
      </section>
    </>
  );
}
