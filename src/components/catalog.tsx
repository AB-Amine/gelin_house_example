'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Catalog, Service } from '@/lib/domain';
import { currentPrice } from '@/lib/domain';
import { groupServices } from '@/lib/service-catalogue';
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
export function ServiceCatalog({
  catalog: initial,
  initialCategory = 'all',
}: {
  catalog: Catalog;
  initialCategory?: string;
}) {
  const { t, locale, catalog } = useWebsiteCopy(initial);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(
    () =>
      catalog.categories.find(
        (c) => c.id === initialCategory || c.slug === initialCategory,
      )?.id ?? 'all',
  );
  const services = catalog.services.filter(
    (s) =>
      s.published &&
      !s.archived &&
      (category === 'all' || s.category_id === category) &&
      `${s.name} ${s.description} ${s.subcategory ?? ''} ${s.service_group ?? ''}`
        .toLocaleLowerCase(locale)
        .includes(query.toLocaleLowerCase(locale)),
  );
  const groups = groupServices(services);
  const categories =
    category === 'all'
      ? [
          ...catalog.categories.map((c) => c.id),
          ...(services.some((s) => s.category_id === null) ? [null] : []),
        ]
      : [category];
  return (
    <div className="official-catalogue">
      <div className="catalog-tools">
        <label className="search-label">
          {t('services.search')}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div
          className="filter-tabs"
          role="group"
          aria-label={t('nav.services')}
        >
          <button
            className={category === 'all' ? 'selected' : ''}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            {t('common.all')}
          </button>
          {catalog.categories.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'selected' : ''}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {categories.map((categoryId) => {
        const matching = groups.filter((g) => g.category === categoryId);
        if (!matching.length) return null;
        const subcategories = [...new Set(matching.map((g) => g.subcategory))];
        return (
          <section
            className="official-catalogue-category"
            key={categoryId ?? 'other'}
          >
            <h2>
              {catalog.categories.find((c) => c.id === categoryId)?.name ??
                t('nav.services')}
            </h2>
            {subcategories.map((subcategory) => (
              <section className="official-catalogue-section" key={subcategory}>
                {subcategory && (
                  <h3 className="official-subcategory-title">{subcategory}</h3>
                )}
                {matching
                  .filter((g) => g.subcategory === subcategory)
                  .map((g) => (
                    <div className="official-catalogue-group" key={g.group}>
                      {g.group && <h4>{g.group}</h4>}
                      <div className="service-grid">
                        {g.services.map((s) => (
                          <ServiceCard
                            key={s.id}
                            service={s}
                            catalog={catalog}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </section>
            ))}
          </section>
        );
      })}
      {!services.length && (
        <p className="fatu-empty">
          {t(
            catalog.services.length
              ? 'services.noResults'
              : 'home.services.empty',
          )}
        </p>
      )}
    </div>
  );
}
