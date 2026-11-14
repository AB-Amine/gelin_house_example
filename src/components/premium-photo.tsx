'use client';
import Image from 'next/image';
import credits from '../../public/images/premium/credits.json';

export type PhotoId =
  | 'hair'
  | 'nails'
  | 'facial'
  | 'caftan'
  | 'bridal'
  | 'interior'
  | 'makeup-session'
  | 'makeup-artistry'
  | 'ritual-care'
  | 'bridal-hair'
  | 'rose-makeup'
  | 'occasion-caftan';
export function categoryPhoto(slug: string): PhotoId {
  if (/coiff|hair/.test(slug)) return 'hair';
  if (/make|maquill/.test(slug)) return 'makeup-artistry';
  if (/location|rental/.test(slug)) return 'caftan';
  return 'facial';
}
export function PremiumPhoto({
  id,
  priority = false,
}: {
  id: PhotoId;
  priority?: boolean;
}) {
  const asset = credits.find((photo) => photo.id === id)!;
  return (
    <figure className={`premium-photo premium-photo-${id}`}>
      <Image
        src={`/images/premium/${id}-1400.webp`}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        sizes={
          priority
            ? '(max-width: 700px) 100vw, 55vw'
            : '(max-width: 600px) 45vw, (max-width: 1000px) 45vw, 25vw'
        }
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
      />
    </figure>
  );
}
