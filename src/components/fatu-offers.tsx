'use client';
import Link from 'next/link';
import type { Catalog } from '@/lib/domain';
import { useWebsiteCopy } from './website-copy';
import { FatuHeading } from './fatu-pages';
export function FatuOffers({ initialCatalog }: { initialCatalog: Catalog }) {
  const { catalog, t } = useWebsiteCopy(initialCatalog);
  return (
    <div className="fatu-container">
      <FatuHeading title="offers.title" />
      <section className="fatu-section">
        {catalog.promotions.length ? (
          catalog.promotions.map((p) => (
            <article className="fatu-empty" key={p.id}>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <p>{p.terms}</p>
              <Link className="fatu-text-link" href="/services">
                {t('nav.services')} ↗
              </Link>
            </article>
          ))
        ) : (
          <p className="fatu-empty">{t('offers.empty')}</p>
        )}
      </section>
    </div>
  );
}
