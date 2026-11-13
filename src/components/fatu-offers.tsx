'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { salonImage } from '@/lib/assets';
import type { Catalog } from '@/lib/domain';
import { useWebsiteCopy } from './website-copy';
import { FatuHeading } from './fatu-pages';
import { PremiumPhoto, categoryPhoto } from './premium-photo';

// Supabase applies publication, date, code and usage-limit rules in fatu_catalog.
// Render that request's snapshot rather than evaluating a second browser clock.
export function OfferCards({
  catalog: initial,
  limit,
  compact = false,
}: {
  catalog: Catalog;
  limit?: number;
  compact?: boolean;
}) {
  const { catalog, t, money, locale, dir } = useWebsiteCopy(initial);
  const track = useRef<HTMLDivElement>(null);
  const published = catalog.promotions.filter((p) => p.active);
  const carousel = published.length > 3;
  const offers = carousel ? published : published.slice(0, limit);
  const move = (direction: number) => {
    const node = track.current;
    if (node)
      node.scrollBy({
        left: node.clientWidth * direction * (dir === 'rtl' ? -1 : 1),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(value));
  if (!offers.length)
    return (
      <div className="premium-offers-empty">
        <div>
          <h3>{t('premium.offersEmpty')}</h3>
          <p>{t('premium.offersEmptyBody')}</p>
        </div>
        <Link className="fatu-text-link" href="/services">
          {t('nav.services')} ↗
        </Link>
      </div>
    );
  return (
    <div className="salon-offers-presentation">
      {carousel && (
        <div className="salon-carousel-controls">
          <span>
            {offers.length} {t('nav.offers').toLocaleLowerCase(locale)}
          </span>
          <div>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={t('offers.previous')}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={t('offers.next')}
            >
              →
            </button>
          </div>
        </div>
      )}
      <div
        ref={track}
        className={`premium-offer-grid${carousel ? ' is-carousel' : ''}`}
        role={carousel ? 'region' : undefined}
        aria-label={carousel ? t('offers.title') : undefined}
        tabIndex={carousel ? 0 : undefined}
      >
        {offers.map((offer) => {
          const upcoming = Date.parse(offer.starts_at) > (catalog.as_of ?? 0);
          const services = catalog.services.filter((service) =>
            catalog.promotion_services.some(
              (link) =>
                link.promotion_id === offer.id &&
                link.service_id === service.id,
            ),
          );
          const category = catalog.categories.find(
            (item) => item.id === services[0]?.category_id,
          );
          const album =
            category?.slug === 'coiffure'
              ? /coiff/i
              : category?.slug === 'makeup'
                ? /maquill|makeup/i
                : category?.slug === 'location'
                  ? /location|caftan/i
                  : /ongl|esth|soin/i;
          const galleryPhoto = catalog.gallery.find((photo) =>
            album.test(photo.album),
          );
          const photo = services.find((service) => service.image_path);
          const path = photo?.image_path || galleryPhoto?.path;
          return (
            <article
              className={`premium-offer-card${upcoming ? ' is-upcoming' : ''}${compact ? ' is-compact' : ''}`}
              key={offer.id}
            >
              <div className="premium-offer-photo">
                {path ? (
                  <figure>
                    <Image
                      src={salonImage(path)}
                      alt={photo?.name || galleryPhoto!.alt}
                      width={720}
                      height={640}
                      unoptimized
                    />
                  </figure>
                ) : (
                  <PremiumPhoto id={categoryPhoto(category?.slug || '')} />
                )}
              </div>
              <div className="premium-offer-heading">
                <span className="premium-offer-status">
                  <i aria-hidden />
                  {t(upcoming ? 'offers.upcoming' : 'offers.available')}
                </span>
                <span className="premium-offer-value">
                  −
                  {offer.kind === 'percentage'
                    ? `${offer.value} %`
                    : money(offer.value, catalog.settings?.currency || 'MAD')}
                </span>
                <h3>{offer.name}</h3>
                {offer.description && <p>{offer.description}</p>}
              </div>
              <div className="premium-offer-detail">
                <div className="premium-offer-dates">
                  <div>
                    <span>{t('offers.starts')}</span>
                    <time dateTime={offer.starts_at}>
                      {date(
                        offer.starts_on
                          ? `${offer.starts_on}T12:00:00Z`
                          : offer.starts_at,
                      )}
                    </time>
                    {offer.starts_time && <small>{offer.starts_time}</small>}
                  </div>
                  <div>
                    <span>{t('offers.ends')}</span>
                    <time dateTime={offer.ends_at}>
                      {date(
                        offer.ends_on
                          ? `${offer.ends_on}T12:00:00Z`
                          : offer.ends_at,
                      )}
                    </time>
                    {offer.ends_time && <small>{offer.ends_time}</small>}
                  </div>
                </div>
                {upcoming && !compact && (
                  <p className="premium-offer-note">
                    {t('offers.upcomingNote')}
                  </p>
                )}
                {services.length > 0 && !compact && (
                  <ul className="premium-offer-services">
                    {services.map((service) => (
                      <li key={service.id}>
                        <Link href={`/services/${service.slug}`}>
                          {service.name} ↗
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {offer.terms && !compact && (
                  <p className="premium-offer-terms">{offer.terms}</p>
                )}
                <Link
                  className="fatu-text-link"
                  href={compact ? '/offres' : '/services'}
                >
                  {t(
                    compact
                      ? 'offers.view'
                      : upcoming
                        ? 'offers.exploreServices'
                        : 'premium.chooseServices',
                  )}{' '}
                  ↗
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
export function FatuOffers({ initialCatalog }: { initialCatalog: Catalog }) {
  return (
    <div className="fatu-container">
      <FatuHeading title="offers.title" body="premium.offersBody" />
      <section className="fatu-section">
        <OfferCards catalog={initialCatalog} />
      </section>
    </div>
  );
}
