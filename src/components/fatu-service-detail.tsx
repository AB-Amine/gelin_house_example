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
          <span className="fatu-eyebrow">
            {[
              catalog.categories.find((c) => c.id === s.category_id)?.name,
              s.subcategory,
              s.service_group,
            ]
              .filter(Boolean)
              .join(' · ') || t('nav.services')}
          </span>
          <h2>
            {s.price_type === 'consultation' || s.price_minor === null
              ? t('catalogue.priceOnRequest')
              : `${s.price_type === 'starting' ? t('services.starting') + ' ' : ''}${money(s.price_minor ?? 0, catalog.settings?.currency ?? 'MAD')}`}
          </h2>
          {s.duration_minutes !== null && s.duration_minutes > 0 && (
            <p>{s.duration_minutes} min</p>
          )}
          {s.service_type !== 'rental' ? (
            <>
              <AddService id={s.id} />
              <Link className="fatu-text-link" href="/reservation">
                {t('nav.booking')} ↗
              </Link>
            </>
          ) : (
            <Link
              className="button secondary"
              href={`${s.service_type === 'rental' ? '/contact' : '/reservation'}?prestation=${encodeURIComponent(s.slug)}`}
            >
              {t(
                s.service_type === 'rental'
                  ? 'catalogue.rentalEnquiry'
                  : 'requestForm.action',
              )}
            </Link>
          )}
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
