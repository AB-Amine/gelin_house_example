'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useLocalCatalog } from '@/lib/demo-store';
import { salonImage } from '@/lib/assets';
import { priceLabel, type Catalog } from '@/lib/domain';
import { AddService } from './basket';
export function LocalServiceDetail({
  initialCatalog,
  slug,
}: {
  initialCatalog: Catalog;
  slug: string;
}) {
  const catalog = useLocalCatalog(initialCatalog);
  const service = catalog.services.find((s) => s.slug === slug);
  if (!service)
    return (
      <div className="container empty-state">
        <h1>Prestation indisponible</h1>
        <Link className="button" href="/services">
          Revenir à la carte
        </Link>
      </div>
    );
  return (
    <div className="container">
      <Link className="text-link" href="/services">
        ← Toutes les prestations
      </Link>
      <section className="local-service-detail">
        <div>
          <span className="eyebrow">UNE ATTENTION RIEN QUE POUR VOUS</span>
          <h1>{service.name}</h1>
          <p>{service.description}</p>
          <div className="service-detail-facts">
            <span>{service.duration_minutes} minutes de douceur</span>
            <strong>{priceLabel(service)}</strong>
          </div>
          <AddService id={service.id} disabled={!service.bookable} />
          <Link className="text-link detail-checkout" href="/reservation">
            Voir ma sélection ↗
          </Link>
          <p className="small">
            Tarif de démonstration · Aucune réservation réelle
          </p>
          {service.preparation && <p>{service.preparation}</p>}
        </div>
        <Image
          src={salonImage(service.image_path || '/atelier.svg')}
          alt={`Illustration : ${service.name}`}
          width={800}
          height={800}
          unoptimized
        />
      </section>
    </div>
  );
}
