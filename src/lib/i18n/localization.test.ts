import { describe, it, expect } from 'vitest';
import {
  locales,
  translate,
  translationKeys,
  validLocale,
} from './dictionaries';
import { localizedCatalog } from '../localization';
import { emptyCatalog, type Catalog } from '../domain';
import { fatuBookingSchema } from '../fatu-schemas';
describe('Fatu language and public content boundaries', () => {
  it('has distinct complete strings for every supported locale without broken Unicode', () => {
    expect(new Set(translationKeys).size).toBe(translationKeys.length);
    for (const key of translationKeys)
      for (const locale of locales) {
        const value = translate(locale, key);
        expect(value.trim(), `${locale}:${key}`).not.toBe('');
        expect(value, `${locale}:${key}`).not.toMatch(/\?{3,}|�/);
        expect(value, `${locale}:${key}`).not.toBe(key);
      }
    expect(translate('ar', 'nav.booking')).toMatch(/[\u0600-\u06ff]/);
    expect(validLocale('unknown')).toBe('fr');
    expect(validLocale('en')).toBe('en');
  });
  it('allows CMS translations of text without allowing price or publication overrides', () => {
    const catalog = {
      ...emptyCatalog,
      services: [
        { id: 'one', name: 'Original', price_minor: 12000, published: true },
      ],
      translations: [
        {
          entity: 'services',
          entity_id: 'one',
          locale: 'ar',
          fields: {
            name: 'اسم الخدمة',
            price_minor: '1',
            published: 'false',
            slug: 'evil',
          },
        },
      ],
    } as unknown as Catalog;
    const result = localizedCatalog(catalog, 'ar');
    expect(result.services[0].name).toBe('اسم الخدمة');
    expect(result.services[0].price_minor).toBe(12000);
    expect(result.services[0].published).toBe(true);
    expect(result.services[0].slug).toBeUndefined();
    expect(catalog.services[0].name).toBe('Original');
    expect(localizedCatalog(catalog, 'en').services[0].name).toBe('Original');
  });
  it('requires the city, event address and reviewed quote for public bookings', () => {
    const input = {
      services: ['11111111-1111-4111-8111-111111111111'],
      city: '22222222-2222-4222-8222-222222222222',
      address: 'Approved event address',
      start: '2026-12-01T10:00:00Z',
      contact: {
        name: 'Client test',
        phone: '+212612345678',
        email: '',
        notes: '',
        consent: true,
      },
      key: '33333333-3333-4333-8333-333333333333',
      token: 'a'.repeat(64),
      fingerprint: 'b'.repeat(64),
    };
    expect(fatuBookingSchema.safeParse(input).success).toBe(true);
    expect(
      fatuBookingSchema.safeParse({ ...input, city: undefined }).success,
    ).toBe(false);
    expect(
      fatuBookingSchema.safeParse({ ...input, address: 'abc' }).success,
    ).toBe(false);
    expect(
      fatuBookingSchema.safeParse({
        ...input,
        contact: { ...input.contact, consent: false },
      }).success,
    ).toBe(false);
    expect(
      fatuBookingSchema.safeParse({ ...input, code: 'x'.repeat(61) }).success,
    ).toBe(false);
  });
});
