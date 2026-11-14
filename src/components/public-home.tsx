'use client';
import Link from 'next/link';
import Image from 'next/image';
import { salonImage } from '@/lib/assets';
import type { Catalog } from '@/lib/domain';
import { useWebsiteCopy } from './website-copy';
import { PremiumPhoto, categoryPhoto } from './premium-photo';
import { OfferCards } from './fatu-offers';
import { SalonTestimonials } from './salon-testimonials';
import { BeautyIcon } from './beauty-icon';
import { FloralMotif } from './floral-motif';
import styles from './public-home.module.css';

export function HomeExperience({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const { t, catalog } = useWebsiteCopy(initialCatalog);
  const categories = ['esthetique', 'coiffure', 'makeup', 'location']
    .map((slug) =>
      catalog.categories.find((category) => category.slug === slug),
    )
    .filter((category) => category !== undefined);
  const gallery = catalog.gallery.slice(0, 6);
  const detail = catalog.gallery.find((photo) =>
    /ongl|nail|manuc/i.test(`${photo.album} ${photo.alt}`),
  );
  return (
    <div className={styles.home}>
      <div className={styles.firstScreen} data-home-first-screen>
        <FloralMotif className={styles.heroFlowers} />
        <section className={styles.hero}>
          <div className={styles.copy}>
            <span className="fatu-eyebrow">
              {catalog.settings?.name || 'GELIN HOUSE'} ·{' '}
              {t('redesign.location')}
            </span>
            <h1>{catalog.settings?.hero_title || t('premium.heroTitle')}</h1>
            <span className={styles.flourish} aria-hidden>
              <BeautyIcon name="heart" />
            </span>
            <p>{catalog.settings?.hero_subtitle || t('premium.heroBody')}</p>
            <div className="fatu-actions">
              <Link className="fatu-button" href="/services">
                {t('premium.chooseServices')} <span aria-hidden>›</span>
              </Link>
              <Link className="fatu-button fatu-button-outline" href="/offres">
                {t('redesign.seeOffers')}
              </Link>
            </div>
          </div>
          <div className={`premium-hero-visual ${styles.visual}`}>
            {catalog.settings?.hero_image_path ? (
              <figure className="premium-photo">
                <Image
                  src={salonImage(catalog.settings.hero_image_path)}
                  alt={catalog.settings.hero_title || catalog.settings.name}
                  width={1400}
                  height={930}
                  sizes="(max-width: 700px) 100vw, 55vw"
                  loading="eager"
                  fetchPriority="high"
                  unoptimized
                />
              </figure>
            ) : (
              <PremiumPhoto id="makeup-session" priority />
            )}
          </div>
        </section>
        <section className={styles.booking} aria-label={t('redesign.steps')}>
          <ol>
            {(['choose', 'date', 'confirm'] as const).map((step, index) => (
              <li key={step}>
                <BeautyIcon
                  name={(['lotus', 'calendar', 'check'] as const)[index]}
                />
                <span>
                  {index + 1}. {t(`redesign.step.${step}`)}
                </span>
              </li>
            ))}
          </ol>
          <p>{t('redesign.confirmation')}</p>
        </section>
      </div>
      <section
        className={`fatu-container premium-section ${styles.categories}`}
        data-home-section="services"
        aria-label={t('nav.services')}
      >
        <FloralMotif className={styles.sectionFlowers} />
        <div className={styles.sectionHead}>
          <span className="fatu-eyebrow">{t('reference.universes')}</span>
          <h2>{t('premium.universes')}</h2>
          <p>{t('premium.universesBody')}</p>
        </div>
        <div className="premium-categories">
          {(categories.length
            ? categories
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
                    height={480}
                    sizes="(max-width: 700px) 45vw, 24vw"
                    unoptimized
                  />
                </figure>
              ) : (
                <PremiumPhoto
                  id={
                    category.slug === 'esthetique'
                      ? 'ritual-care'
                      : category.slug === 'coiffure'
                        ? 'bridal-hair'
                        : category.slug === 'makeup'
                          ? 'rose-makeup'
                          : category.slug === 'location'
                            ? 'occasion-caftan'
                            : categoryPhoto(category.slug)
                  }
                />
              )}
              <div>
                <BeautyIcon
                  name={
                    category.slug === 'coiffure'
                      ? 'scissors'
                      : category.slug === 'location'
                        ? 'hanger'
                        : category.slug === 'makeup'
                          ? 'sparkle'
                          : 'lotus'
                  }
                />
                <h3>{category.name}</h3>
                <span aria-hidden>›</span>
              </div>
            </Link>
          ))}
        </div>
        <div className={styles.explore}>
          <span aria-hidden>✦</span>
          <Link className="fatu-button" href="/services">
            {t('premium.explore')} <span aria-hidden>›</span>
          </Link>
          <span aria-hidden>✦</span>
        </div>
      </section>
      <section
        className={`premium-offers-band ${styles.offers}`}
        data-home-section="offers"
      >
        <FloralMotif className={styles.offerFlowers} />
        <div className="fatu-container premium-section">
          <span className={`fatu-eyebrow ${styles.offerEyebrow}`}>
            {t('nav.offers')}
          </span>
          <div className={styles.heading}>
            <span aria-hidden>✦</span>
            <h2>{t('premium.offersTitle')}</h2>
            <span aria-hidden>✦</span>
          </div>
          <OfferCards catalog={catalog} limit={2} compact />
          <Link className={`fatu-text-link ${styles.more}`} href="/offres">
            {t('premium.allOffers')} <span aria-hidden>›</span>
          </Link>
        </div>
      </section>
      <section
        className={`fatu-container premium-section ${styles.universe}`}
        data-home-section="gallery"
      >
        <div className={styles.universeTitle}>
          <h2>
            {t('aboutPage.universe')} <BeautyIcon name="heart" />
          </h2>
          <p>
            {t(gallery.length ? 'home.galleryIntro' : 'premium.inspiration')}
          </p>
          <Link className="fatu-button fatu-button-outline" href="/portfolio">
            {t('redesign.gallery')} <span aria-hidden>›</span>
          </Link>
        </div>
        <div className={styles.strip}>
          {gallery.length
            ? gallery.map((photo) => (
                <Link href="/portfolio" key={photo.id}>
                  <Image
                    src={salonImage(photo.path)}
                    alt={photo.alt}
                    width={1000}
                    height={700}
                    sizes="(max-width: 700px) 90vw, (max-width: 1000px) 45vw, 48vw"
                    unoptimized
                  />
                </Link>
              ))
            : (
                [
                  'interior',
                  'nails',
                  'makeup-session',
                  'rose-makeup',
                  'occasion-caftan',
                  'ritual-care',
                ] as const
              ).map((id) => <PremiumPhoto id={id} key={id} />)}
        </div>
        <div className={styles.gallerySignature}>
          <span aria-hidden>✦</span>
          <span>
            {t(
              gallery.length
                ? 'reference.gallerySignature'
                : 'premium.inspiration',
            )}
          </span>
          <span aria-hidden>✦</span>
        </div>
      </section>
      <section
        className={`premium-section ${styles.about}`}
        data-home-section="about"
      >
        <FloralMotif className={styles.aboutFlowers} />
        <div className={`fatu-container ${styles.aboutInner}`}>
          <div className={styles.aboutPhoto}>
            {detail ? (
              <Image
                src={salonImage(detail.path)}
                alt={detail.alt}
                width={900}
                height={1000}
                sizes="(max-width: 700px) 90vw, 45vw"
                unoptimized
              />
            ) : (
              <PremiumPhoto id="nails" />
            )}
          </div>
          <div className={styles.aboutCopy}>
            <span className="fatu-eyebrow">{t('premium.beautyHouse')}</span>
            <h2>{t('premium.aboutTitle')}</h2>
            <p>{catalog.settings?.about || t('premium.aboutBody')}</p>
            <div className={styles.values}>
              {(['lotus', 'sparkle', 'heart'] as const).map((icon, index) => (
                <div key={icon}>
                  <BeautyIcon name={icon} />
                  <span>{t(`reference.value.${index}`)}</span>
                </div>
              ))}
            </div>
            <Link className="fatu-button" href="/a-propos">
              {t('home.about.more')} <span aria-hidden>›</span>
            </Link>
          </div>
        </div>
      </section>
      {!!catalog.reviews?.length && (
        <div className={styles.reviews}>
          <FloralMotif className={styles.sectionFlowers} />
          <SalonTestimonials catalog={catalog} />
        </div>
      )}
      <section className={`premium-section premium-final-cta ${styles.final}`}>
        <FloralMotif className={styles.finalFlowers} />
        <div className={styles.finalCopy}>
          <BeautyIcon name="lotus" />
          <span className="fatu-eyebrow">{t('premium.yourMoment')}</span>
          <h2>{t('premium.ctaTitle')}</h2>
          <p>{t('reference.finalBody')}</p>
          <Link className="fatu-button" href="/reservation">
            <BeautyIcon name="calendar" />
            {t('nav.booking')}
          </Link>
        </div>
        <div className={styles.finalPhoto}>
          <PremiumPhoto id="makeup-session" />
        </div>
      </section>
    </div>
  );
}
