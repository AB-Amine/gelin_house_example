import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog';
import { ServiceCatalog } from '@/components/catalog';
export const metadata: Metadata = {
  title: 'Les prestations',
  alternates: { canonical: '/services' },
};
export default async function Services({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { catalog } = await getCatalog();
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">LA CARTE GELIN HOUSE</span>
        <h1>
          Votre beauté,
          <br />
          <em>à la carte.</em>
        </h1>
        <p>
          Découvrez les prestations, leurs durées et leurs tarifs. Composez
          votre sélection à votre rythme.
        </p>
      </header>
      <ServiceCatalog
        catalog={catalog}
        initialCategory={(await searchParams).categorie}
      />
    </div>
  );
}
