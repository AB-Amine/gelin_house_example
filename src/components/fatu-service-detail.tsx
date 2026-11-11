'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { Catalog } from '@/lib/domain';
import { salonImage } from '@/lib/assets';
import { AddService } from './basket';
import { ServiceCard } from './catalog';
import { useWebsiteCopy } from './website-copy';
export function FatuServiceDetail({
  initialCatalog,
  slug,
}: {
  initialCatalog: Catalog;
  slug: string;
}) {
  const { catalog, t, money } = useWebsiteCopy(initialCatalog);
  const s = catalog.services.find((s) => s.slug === slug);
  if (!s) return null;
  const cities = (catalog.cities ?? []).filter((c) =>
    catalog.service_cities?.some(
      (sc) => sc.service_id === s.id && sc.city_id === c.id,
    ),
  );
  return (
    <div className="fatu-container">
      <header className="fatu-page-heading">
        <Link className="fatu-text-link" href="/services">
          ← {t('nav.services')}
        </Link>
        <h1>{s.name}</h1>
        <p>{s.description}</p>
      </header>
      <div className="fatu-split fatu-section">
        {s.image_path && (
          <Image
            className="service-detail-image"
            src={salonImage(s.image_path)}
            alt={s.name}
            width={900}
            height={1100}
            unoptimized
          />
        )}
        <div>
          <span className="fatu-eyebrow">{t('nav.services')}</span>
          <h2>
            {s.price_type === 'consultation'
              ? t('services.consultation')
              : `${s.price_type === 'starting' ? t('services.starting') + ' ' : ''}${money(s.price_minor ?? 0, catalog.settings?.currency ?? 'MAD')}`}
          </h2>
          <p>{s.duration_minutes} min</p>
          <p>{t('common.notConfirmed')}</p>
          <AddService id={s.id} disabled={!s.bookable} />
          <Link className="fatu-text-link" href="/reservation">
            {t('nav.booking')} ↗
          </Link>
          {s.included_items && (
            <section>
              <h3>{t('services.included')}</h3>
              <p className="prose">{s.included_items}</p>
            </section>
          )}
          {s.preparation && (
            <section>
              <h3>{t('field.preparation')}</h3>
              <p className="prose">{s.preparation}</p>
            </section>
          )}
          <section>
            <h3>{t('services.cities')}</h3>
            {cities.length ? (
              cities.map((c) => (
                <p key={c.id}>
                  {c.name} · {t('booking.travel')}:{' '}
                  {money(
                    c.travel_fee_minor,
                    catalog.settings?.currency ?? 'MAD',
                  )}
                </p>
              ))
            ) : (
              <p>{t('common.awaiting')}</p>
            )}
          </section>
        </div>
      </div>
      <div className="service-grid">
        {catalog.services
          .filter((x) => x.category_id === s.category_id && x.id !== s.id)
          .slice(0, 3)
          .map((s) => (
            <ServiceCard key={s.id} service={s} catalog={catalog} />
          ))}
      </div>
    </div>
  );
}
