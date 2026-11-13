'use client';
import Image from 'next/image';
import credits from '../../public/images/premium/credits.json';
import { useI18n } from './locale-provider';

export type PhotoId =
  'hair' | 'nails' | 'facial' | 'caftan' | 'bridal' | 'interior';
export function categoryPhoto(slug: string): PhotoId {
  if (/coiff|hair/.test(slug)) return 'hair';
  if (/make|maquill/.test(slug)) return 'bridal';
  if (/location|rental/.test(slug)) return 'caftan';
  return 'nails';
}
export function PremiumPhoto({
  id,
  priority = false,
}: {
  id: PhotoId;
  priority?: boolean;
}) {
  const { t } = useI18n();
  const asset = credits.find((photo) => photo.id === id)!;
  return (
    <figure className={`premium-photo premium-photo-${id}`}>
      <picture>
        <source
          type="image/webp"
          srcSet={[320, 720, 1400]
            .map((w) => `/images/premium/${id}-${w}.webp ${w}w`)
            .join(', ')}
          sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 38vw"
        />
        <Image
          src={`/images/premium/${id}-1400.webp`}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          unoptimized
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
        />
      </picture>
      <figcaption>
        {t(
          id === 'interior'
            ? 'premium.interiorInspiration'
            : 'premium.inspiration',
        )}
      </figcaption>
    </figure>
  );
}
