import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/catalog';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL;
  if (!base?.startsWith('https://')) return [];
  const { catalog } = await getCatalog();
  return [
    '',
    '/services',
    '/offres',
    '/galerie',
    '/a-propos',
    '/contact',
    '/confidentialite',
    ...catalog.services.map((s) => `/services/${s.slug}`),
  ].map((path) => ({ url: `${base}${path}` }));
}
