'use client';
import Link from 'next/link';
import Image from 'next/image';
import { salonImage } from '@/lib/assets';
import type { Catalog } from '@/lib/domain';
import { useWebsiteCopy } from './website-copy';
import { FatuPhoto } from './fatu-photo';
import { PremiumPhoto, categoryPhoto } from './premium-photo';
import { ServiceCard } from './catalog';
import { OfferCards } from './fatu-offers';
import { SalonTestimonials } from './salon-testimonials';
import styles from './public-home.module.css';

export function HomeExperience({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const { t, catalog } = useWebsiteCopy(initialCatalog);
  const featured = catalog.services
    .filter((s) => s.featured && s.published && !s.archived)
    .slice(0, 3);
  const gallery = catalog.gallery.slice(0, 3);
  const categoryCards = ['esthetique', 'coiffure', 'makeup', 'location']
    .map((slug) =>
      catalog.categories.find((category) => category.slug === slug),
    )
    .filter((category) => category !== undefined);
  return (
    <>
      <section className={`premium-hero fatu-container ${styles.hero}`}>
        <div className="premium-hero-copy">
          <span className="fatu-eyebrow">
            {catalog.settings?.name || 'GELIN HOUSE'} /{' '}
            {t('premium.beautyHouse')}
          </span>
          <h1>{catalog.settings?.hero_title || t('premium.heroTitle')}</h1>
          <p>{catalog.settings?.hero_subtitle || t('premium.heroBody')}</p>
          <div className="fatu-actions">
            <Link className="fatu-button" href="/reservation">
              {t('nav.booking')} <span aria-hidden>↗</span>
            </Link>
            <Link className="fatu-text-link" href="/services">
              {t('premium.explore')} ↗
            </Link>
          </div>
          <small>{t('premium.simpleBooking')}</small>
        </div>
        <div className="premium-hero-visual">
          {catalog.settings?.hero_image_path ? (
            <figure className="fatu-photo">
              <Image
                src={salonImage(catalog.settings.hero_image_path)}
                alt={catalog.settings.hero_title || catalog.settings.name}
                width={1400}
                height={1800}
                loading="eager"
                fetchPriority="high"
                unoptimized
              />
            </figure>
          ) : (
            <FatuPhoto id="editorial-beauty" priority />
          )}
          <div className="premium-hero-tag">
            <span>{catalog.settings?.name || 'GELIN HOUSE'}</span>
            <strong>{t('premium.heroTag')}</strong>
            <Link href="/services">{t('nav.services')} ↗</Link>
          </div>
        </div>
      </section>
      <section className="fatu-container premium-section">
        <div className="premium-section-head">
          <div>
            <span className="fatu-eyebrow">01 / {t('nav.services')}</span>
            <h2>{t('premium.universes')}</h2>
          </div>
          <p>{t('premium.universesBody')}</p>
        </div>
        <div className="premium-categories">
          {(categoryCards.length
            ? categoryCards
            : catalog.categories.slice(0, 4)
          ).map((category) => (
            <Link
              href={`/services?categorie=${encodeURIComponent(category.slug)}`}
              className="premium-category"
              key={category.id}
            >
              {category.image_path ? (
                <figure className="premium-photo">
                  <Image
                    src={salonImage(category.image_path)}
                    alt={category.name}
                    width={720}
                    height={900}
                    unoptimized
                  />
                </figure>
              ) : (
                <PremiumPhoto id={categoryPhoto(category.slug)} />
              )}
              <div>
                <h3>{category.name}</h3>
                <span aria-hidden>↗</span>
              </div>
              {category.description && <p>{category.description}</p>}
            </Link>
          ))}
        </div>
      </section>
      <section className="premium-offers-band">
        <div className="fatu-container premium-section">
          <div className="premium-section-head">
            <div>
              <span className="fatu-eyebrow">02 / {t('nav.offers')}</span>
              <h2>{t('premium.offersTitle')}</h2>
            </div>
            <Link className="fatu-text-link" href="/offres">
              {t('premium.allOffers')} ↗
            </Link>
          </div>
          <OfferCards catalog={catalog} limit={3} compact />
        </div>
      </section>
      {featured.length > 0 && (
        <section className="fatu-container premium-section">
          <div className="premium-section-head">
            <h2>{t('home.services.title')}</h2>
            <Link className="fatu-text-link" href="/services">
              {t('nav.services')} ↗
            </Link>
          </div>
          <div className="service-grid">
            {featured.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                catalog={catalog}
              />
            ))}
          </div>
        </section>
      )}
      <section className="fatu-container premium-section premium-introduction">
        <div className="premium-intro-photos">
          <PremiumPhoto id="interior" />
          <PremiumPhoto id="facial" />
        </div>
        <div>
          <span className="fatu-eyebrow">
            {catalog.settings?.name || 'GELIN HOUSE'}
          </span>
          <h2>{t('premium.aboutTitle')}</h2>
          <p>{catalog.settings?.about || t('premium.aboutBody')}</p>
          <Link className="fatu-text-link" href="/a-propos">
            {t('home.about.more')} ↗
          </Link>
        </div>
      </section>
      <section className="fatu-container premium-section">
        <div className="premium-section-head">
          <div>
            <span className="fatu-eyebrow">03 / {t('nav.portfolio')}</span>
            <h2>{t('premium.portfolioTitle')}</h2>
          </div>
          <Link className="fatu-text-link" href="/portfolio">
            {t('hero.portfolio')} ↗
          </Link>
        </div>
        {gallery.length ? (
          <div className="premium-gallery-preview">
            {gallery.map((photo) => (
              <Link href="/portfolio" key={photo.id}>
                <Image
                  src={salonImage(photo.path)}
                  alt={photo.alt}
                  width={720}
                  height={800}
                  unoptimized
                />
                <span>{photo.title || photo.alt} ↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="premium-gallery-empty">
            <p>{t('premium.portfolioEmpty')}</p>
            {catalog.settings?.instagram && (
              <a
                className="fatu-text-link"
                href={catalog.settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram ↗
              </a>
            )}
          </div>
        )}
      </section>
      <section className="premium-values-band">
        <div className="fatu-container premium-section">
          {catalog.reviews?.length ? (
            <>
              <div className="premium-section-head">
                <h2>{t('home.reviews.title')}</h2>
                <span className="fatu-eyebrow">{t('premium.realReviews')}</span>
              </div>
              <div className="fatu-review-grid">
                {catalog.reviews.slice(0, 3).map((review) => (
                  <figure key={review.id}>
                    <blockquote>« {review.body} »</blockquote>
                    <figcaption>
                      {review.name}
                      {review.rating !== null && (
                        <span> · {review.rating}/5</span>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2>{t('premium.valuesTitle')}</h2>
              <div className="premium-values">
                {['choice', 'clarity', 'contact'].map((key, index) => (
                  <article key={key}>
                    <span>0{index + 1}</span>
                    <h3>{t(`premium.value.${key}`)}</h3>
                    <p>{t(`premium.value.${key}Body`)}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      {!catalog.reviews?.length && <SalonTestimonials catalog={catalog} />}
      <section className="fatu-container premium-section premium-final-cta">
        <div>
          <span className="fatu-eyebrow">{t('premium.yourMoment')}</span>
          <h2>{t('premium.ctaTitle')}</h2>
          <p>{t('premium.simpleBooking')}</p>
        </div>
        <Link className="fatu-button" href="/reservation">
          {t('nav.booking')} ↗
        </Link>
      </section>
    </>
  );
}
