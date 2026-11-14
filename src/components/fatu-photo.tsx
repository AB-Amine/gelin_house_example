'use client';
import Image from 'next/image';
import imageManifest from '../../public/images/manifest.json';
import { useI18n } from './locale-provider';
type Asset = {
  id: string;
  path: string;
  alt: { fr: string; en: string; ar: string };
  width?: number;
  height?: number;
  author: string;
  temporary: boolean;
};
export function FatuPhoto({
  id,
  className = '',
  priority = false,
}: {
  id: string;
  className?: string;
  priority?: boolean;
  caption?: boolean;
}) {
  const { locale } = useI18n();
  const item = (imageManifest as Asset[]).find((a) => a.id === id);
  if (!item) return null;
  return (
    <figure className={`fatu-photo ${className}`}>
      <picture>
        <source
          type="image/webp"
          srcSet={[320, 720, 1400]
            .map((w) => `${item.path}-${w}.webp ${w}w`)
            .join(', ')}
          sizes="(max-width: 650px) 100vw, (max-width: 1100px) 50vw, 45vw"
        />
        <Image
          src={`${item.path}-1400.webp`}
          alt={item.alt[locale]}
          width={item.width ?? 1400}
          height={item.height ?? 1800}
          unoptimized
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
        />
      </picture>
    </figure>
  );
}
