'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Catalog, Service } from '@/lib/domain';
import { currentPrice, money, priceLabel } from '@/lib/domain';
import { AddService } from './basket';
export function ServiceCard({
  service,
  catalog,
}: {
  service: Service;
  catalog: Catalog;
}) {
  const price = currentPrice(service, catalog);
  return (
    <article className="service-card">
      {service.image_path && (
        <Image
          className="service-photo"
          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/salon-images/${service.image_path}`}
          alt={service.name}
          width={600}
          height={400}
          unoptimized
        />
      )}
      <div className="service-top">
        <span className="eyebrow">
          {catalog.categories.find((c) => c.id === service.category_id)?.name ??
            'La carte'}
        </span>
        <span>{service.duration_minutes} min</span>
      </div>
      <h3>
        <Link href={`/services/${service.slug}`}>{service.name}</Link>
      </h3>
      <p>{service.description}</p>
      <div className="service-price">
        {price.promotion ? (
          <>
            <del>{priceLabel(service)}</del> {money(price.amount!)}
            <small>{price.promotion.name}</small>
          </>
        ) : (
          priceLabel(service)
        )}
      </div>
      <AddService id={service.id} disabled={!service.bookable} />
    </article>
  );
}
export function ServiceCatalog({
  catalog,
  initialCategory = 'all',
}: {
  catalog: Catalog;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(
    catalog.categories.some((c) => c.id === initialCategory)
      ? initialCategory
      : 'all',
  );
  const services = catalog.services.filter(
    (s) =>
      (category === 'all' || s.category_id === category) &&
      `${s.name} ${s.description}`
        .toLocaleLowerCase('fr')
        .includes(query.toLocaleLowerCase('fr')),
  );
  return (
    <>
      <div className="catalog-tools">
        <label className="search-label">
          Rechercher une prestation
          <input
            type="search"
            placeholder="Un nom, une envie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filter-tabs" aria-label="Catégories">
          <button
            className={category === 'all' ? 'selected' : ''}
            onClick={() => setCategory('all')}
          >
            Tout voir
          </button>
          {catalog.categories.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'selected' : ''}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="service-grid">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} catalog={catalog} />
        ))}
      </div>
      {!services.length && (
        <p className="empty-state">
          {catalog.services.length
            ? 'Aucune prestation ne correspond à votre recherche.'
            : 'La carte des prestations sera publiée après validation par le salon.'}
        </p>
      )}
    </>
  );
}
