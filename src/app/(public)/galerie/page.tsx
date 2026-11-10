import Image from 'next/image';
import { getCatalog } from '@/lib/catalog';
import { Placeholder } from '@/components/site-shell';
export const metadata = {
  title: 'La galerie',
  alternates: { canonical: '/galerie' },
};
export default async function Gallery() {
  const { catalog } = await getCatalog();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">L’UNIVERS GELIN HOUSE</span>
        <h1>
          Les détails
          <br />
          <em>font la beauté.</em>
        </h1>
        <p>Les images de la maison et de ses réalisations.</p>
      </header>
      {catalog.gallery.length ? (
        <div className="gallery-grid">
          {catalog.gallery.map((g) => (
            <figure key={g.id}>
              <Image
                src={`${base}/storage/v1/object/public/salon-images/${g.path}`}
                alt={g.alt}
                width={650}
                height={800}
                unoptimized
              />
              <figcaption>{g.album}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <Placeholder
          label="Les photographies autorisées du salon seront publiées ici."
          large
        />
      )}
    </div>
  );
}
