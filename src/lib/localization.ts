import type { Catalog } from './domain';
import type { Locale } from './i18n/dictionaries';
const allowed = [
  'name',
  'description',
  'preparation',
  'included_items',
  'title',
  'body',
  'alt',
];
export function localizedCatalog(catalog: Catalog, locale: Locale): Catalog {
  const settingsTranslation = catalog.translations?.find(
    (x) =>
      x.entity === 'salon_settings' &&
      x.entity_id === '00000000-0000-4000-8000-000000000001' &&
      x.locale === locale,
  );
  function rows<T extends { id?: string }>(entity: string, values: T[]): T[] {
    return values.map((row) => {
      const translation = catalog.translations?.find(
        (x) =>
          x.entity === entity && x.entity_id === row.id && x.locale === locale,
      );
      return translation
        ? {
            ...row,
            ...Object.fromEntries(
              Object.entries(translation.fields).filter(
                ([key, value]) =>
                  allowed.includes(key) && typeof value === 'string',
              ),
            ),
          }
        : row;
    });
  }
  return {
    ...catalog,
    settings: catalog.settings
      ? {
          ...catalog.settings,
          ...Object.fromEntries(
            Object.entries(settingsTranslation?.fields ?? {}).filter(
              ([key, value]) =>
                [
                  'name',
                  'about',
                  'hero_title',
                  'hero_subtitle',
                  'privacy_text',
                  'policy_text',
                  'deposit_policy',
                  'address',
                ].includes(key) && typeof value === 'string',
            ),
          ),
        }
      : null,
    services: rows('services', catalog.services),
    categories: rows('categories', catalog.categories),
    cities: rows('cities', catalog.cities ?? []),
    gallery: rows('gallery', catalog.gallery),
    reviews: rows('reviews', catalog.reviews ?? []),
    content: rows(
      'website_content',
      catalog.content as (Catalog['content'][number] & { id?: string })[],
    ),
  };
}
