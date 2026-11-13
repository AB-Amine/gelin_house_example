'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { Catalog } from '@/lib/domain';
import { salonImage } from '@/lib/assets';
import { useWebsiteCopy } from './website-copy';
import { PremiumPhoto, categoryPhoto } from './premium-photo';
import { SalonTestimonials } from './salon-testimonials';

export function FatuAbout({ catalog: initial }: { catalog: Catalog }) {
  const { catalog, t } = useWebsiteCopy(initial);
  const name = catalog.settings?.name || 'GELIN HOUSE';
  const salon = catalog.gallery.filter((photo) => /^salon$/i.test(photo.album));
  const hero = salon[0];
  const categories = ['esthetique', 'coiffure', 'makeup', 'location']
    .map((slug) =>
      catalog.categories.find((category) => category.slug === slug),
    )
    .filter((category) => category !== undefined);
  const photoFor = (slug: string) =>
    catalog.gallery.find((photo) => {
      const album = photo.album.toLocaleLowerCase('fr');
      return slug === 'esthetique'
        ? /ongl|esth|soin/.test(album)
        : slug === 'makeup'
          ? /maquill|makeup/.test(album)
          : slug === 'coiffure'
            ? /coiff/.test(album)
            : /location|caftan/.test(album);
    });
  return (
    <div className="salon-about">
      <section className="salon-about-hero fatu-container premium-section">
        <div>
          <span className="fatu-eyebrow">
            {t('nav.about')} / {name}
          </span>
          <h1>
            {t('aboutPage.welcome')} <em>{name}</em>
          </h1>
          <p className="salon-about-subtitle">{t('aboutPage.subtitle')}</p>
          <p>{catalog.settings?.about || t('premium.aboutBody')}</p>
          <Link className="fatu-button" href="/services">
            {t('aboutPage.discover')} ↗
          </Link>
        </div>
        <div className="salon-about-hero-photo">
          {hero ? (
            <figure>
              <Image
                src={salonImage(hero.path)}
                alt={hero.alt}
                width={480}
                height={720}
                loading="eager"
                fetchPriority="high"
                unoptimized
              />
              <figcaption>{hero.title || t('aboutPage.ourSalon')}</figcaption>
            </figure>
          ) : (
            <PremiumPhoto id="interior" priority />
          )}
          <span className="salon-about-photo-note">{t('aboutPage.pause')}</span>
        </div>
      </section>
      <section className="salon-about-universes fatu-container premium-section">
        <div className="premium-section-head">
          <div>
            <span className="fatu-eyebrow">01 / {t('aboutPage.universe')}</span>
            <h2>{t('aboutPage.universeTitle')}</h2>
          </div>
          <p>{t('premium.universesBody')}</p>
        </div>
        <div className="premium-categories">
          {categories.map((category) => {
            const photo = photoFor(category.slug);
            const path = category.image_path || photo?.path;
            return (
              <Link
                className="premium-category"
                key={category.id}
                href={`/services?categorie=${encodeURIComponent(category.slug)}`}
              >
                {path ? (
                  <figure className="premium-photo">
                    <Image
                      src={salonImage(path)}
                      alt={category.image_path ? category.name : photo!.alt}
                      width={480}
                      height={640}
                      unoptimized
                    />
                  </figure>
                ) : (
                  <PremiumPhoto id={categoryPhoto(category.slug)} />
                )}
                <div>
                  <h3>{t(`aboutPage.category.${category.slug}`)}</h3>
                  <span aria-hidden>↗</span>
                </div>
                <p>
                  {category.description ||
                    t(`aboutPage.categoryBody.${category.slug}`)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="salon-about-philosophy">
        <div className="fatu-container premium-section">
          <div className="premium-section-head">
            <div>
              <span className="fatu-eyebrow">
                02 / {t('aboutPage.philosophy')}
              </span>
              <h2>{t('aboutPage.philosophyTitle')}</h2>
            </div>
          </div>
          <div className="salon-philosophy-grid">
            {['listen', 'beauty', 'wellbeing'].map((key, index) => {
              const entry = catalog.content.find(
                (item) => item.key === `about.philosophy.${key}`,
              );
              return (
                <article key={key}>
                  <span aria-hidden>{['◌', '✧', '⌁'][index]}</span>
                  <h3>{entry?.title || t(`aboutPage.${key}`)}</h3>
                  <p>{entry?.body || t(`aboutPage.${key}Body`)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="salon-about-atmosphere fatu-container premium-section">
        <div className="premium-section-head">
          <div>
            <span className="fatu-eyebrow">
              03 / {t('aboutPage.atmosphere')}
            </span>
            <h2>
              {t(salon.length ? 'aboutPage.ourSalon' : 'aboutPage.inspiration')}
            </h2>
          </div>
          <Link className="fatu-text-link" href="/portfolio">
            {t('nav.portfolio')} ↗
          </Link>
        </div>
        <div className="salon-atmosphere-layout">
          {salon.length ? (
            <>
              <Link href="/portfolio" className="salon-atmosphere-main">
                <Image
                  src={salonImage(salon[0].path)}
                  alt={salon[0].alt}
                  width={480}
                  height={720}
                  unoptimized
                />
              </Link>
              <div className="salon-atmosphere-side">
                <span className="fatu-eyebrow">{name}</span>
                <h3>{t('aboutPage.atmosphereTitle')}</h3>
                <p>{t('aboutPage.atmosphereBody')}</p>
                {catalog.settings?.address && (
                  <address>{catalog.settings.address}</address>
                )}
                <Link className="fatu-text-link" href="/contact">
                  {t('nav.contact')} ↗
                </Link>
              </div>
              {catalog.gallery.find((photo) => /ongl/i.test(photo.album)) && (
                <Link className="salon-atmosphere-detail" href="/portfolio">
                  <Image
                    src={salonImage(
                      catalog.gallery.find((photo) =>
                        /ongl/i.test(photo.album),
                      )!.path,
                    )}
                    alt={
                      catalog.gallery.find((photo) =>
                        /ongl/i.test(photo.album),
                      )!.alt
                    }
                    width={480}
                    height={640}
                    unoptimized
                  />
                </Link>
              )}
            </>
          ) : (
            <>
              <PremiumPhoto id="interior" />
              <PremiumPhoto id="facial" />
            </>
          )}
        </div>
      </section>
      {catalog.content
        .filter(
          (item) =>
            item.key.startsWith('about.') &&
            !item.key.startsWith('about.philosophy.'),
        )
        .map((item) => (
          <section key={item.key} className="fatu-container premium-section">
            <h2>{item.title}</h2>
            <p className="prose">{item.body}</p>
          </section>
        ))}
      <SalonTestimonials catalog={catalog} />
      <section className="salon-about-cta">
        <div className="fatu-container premium-section">
          <span className="fatu-eyebrow">{t('premium.yourMoment')}</span>
          <h2>{t('aboutPage.cta')}</h2>
          <p>{t('premium.simpleBooking')}</p>
          <Link className="fatu-button" href="/reservation">
            {t('nav.booking')} ↗
          </Link>
        </div>
      </section>
    </div>
  );
}
