import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCatalog } from '@/lib/catalog';
import { priceLabel, currentPrice, money } from '@/lib/domain';
import { AddService } from '@/components/basket';
import { ServiceCard } from '@/components/catalog';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { catalog } = await getCatalog();
  const s = catalog.services.find((s) => s.slug === slug);
  return {
    title: s?.name ?? 'Prestation introuvable',
    description: s?.description.slice(0, 160),
    alternates: { canonical: `/services/${slug}` },
  };
}
export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { catalog } = await getCatalog();
  const s = catalog.services.find((s) => s.slug === slug);
  if (!s) notFound();
  const price = currentPrice(s, catalog);
  return (
    <div className="container">
      <Link href="/services" className="text-link">
        ← La carte
      </Link>
      <div className="page-heading" style={{ paddingTop: 40 }}>
        <span className="eyebrow">
          {catalog.categories.find((c) => c.id === s.category_id)?.name ??
            'GELIN HOUSE'}
        </span>
        <h1>{s.name}</h1>
        {s.image_path && (
          <Image
            className="service-detail-image"
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/salon-images/${s.image_path}`}
            alt={s.name}
            width={900}
            height={650}
            unoptimized
          />
        )}
        <p className="prose">{s.description}</p>
        <p>
          {s.duration_minutes} minutes ·{' '}
          {price.promotion ? (
            <>
              <del>{priceLabel(s)}</del> {money(price.amount!)} —{' '}
              {price.promotion.name}
            </>
          ) : (
            priceLabel(s)
          )}
        </p>
        {s.price_type !== 'fixed' && (
          <p className="notice">
            Le montant final est à confirmer avec le salon.
          </p>
        )}
        <AddService id={s.id} disabled={!s.bookable} />
        {s.preparation && (
          <section style={{ marginTop: 40 }}>
            <h2>Avant votre visite</h2>
            <p className="prose">{s.preparation}</p>
          </section>
        )}
      </div>
      <h2>À découvrir aussi</h2>
      <div className="service-grid">
        {catalog.services
          .filter((x) => x.category_id === s.category_id && x.id !== s.id)
          .slice(0, 3)
          .map((service) => (
            <ServiceCard key={service.id} service={service} catalog={catalog} />
          ))}
      </div>
    </div>
  );
}
