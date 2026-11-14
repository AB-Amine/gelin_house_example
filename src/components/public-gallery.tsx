'use client';
import { useLocalCatalog } from '@/lib/demo-store';
import type { Catalog } from '@/lib/domain';
import { salonImage } from '@/lib/assets';
import Image from 'next/image';
import { Placeholder } from '@/components/site-shell';
import { publicGallery } from '@/lib/public-gallery';
import { useI18n } from './locale-provider';
export function GalleryExperience({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const catalog = useLocalCatalog(initialCatalog);
  const { locale } = useI18n();
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
          {publicGallery(catalog.gallery, locale).map((g) => (
            <figure key={g.id}>
              <Image
                src={salonImage(g.path)}
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
