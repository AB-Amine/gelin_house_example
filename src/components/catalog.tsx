'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { Catalog, Service } from '@/lib/domain';
import { currentPrice } from '@/lib/domain';
import { salonImage } from '@/lib/assets';
import { AddService } from './basket';
import { useWebsiteCopy } from './website-copy';
export function ServiceCard({
  service,
  catalog: initial,
}: {
  service: Service;
  catalog: Catalog;
}) {
  const { t, money, catalog } = useWebsiteCopy(initial);
  const s = catalog.services.find((s) => s.id === service.id) ?? service;
  const price = currentPrice(s, catalog);
  const currency = catalog.settings?.currency ?? 'MAD';
  return (
    <article className="service-card official-service-card">
      {s.image_path && (
        <Image
          className="service-photo"
          src={salonImage(s.image_path)}
          alt={s.name}
          width={720}
          height={540}
          unoptimized
        />
      )}
      <div className="service-top">
        <span className="eyebrow">
          {[
            catalog.categories.find((c) => c.id === s.category_id)?.name,
            s.subcategory,
            s.service_group,
          ]
            .filter(Boolean)
            .join(' · ') || t('nav.services')}
        </span>
        {s.duration_minutes !== null && s.duration_minutes > 0 && (
          <span>{s.duration_minutes} min</span>
        )}
      </div>
      <h3>
        <Link href={`/services/${s.slug}`}>{s.name}</Link>
      </h3>
      {s.description && <p>{s.description}</p>}
      <div className="service-price">
        {s.price_type === 'consultation' || price.amount === null ? (
          t('catalogue.priceOnRequest')
        ) : (
          <>
            {s.price_type === 'starting' && `${t('services.starting')} `}
            {price.promotion && (
              <del>{money(s.price_minor!, currency)}</del>
            )}{' '}
            {money(price.amount, currency)}
            {price.promotion && <small>{price.promotion.name}</small>}
          </>
        )}
      </div>
      <div className="official-service-actions">
        <Link className="fatu-text-link" href={`/services/${s.slug}`}>
          {t('common.details')} ↗
        </Link>
        {s.service_type !== 'rental' ? (
          <AddService id={s.id} />
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
      </div>
    </article>
  );
}
export { ServiceCatalog } from './prestations-catalogue';
