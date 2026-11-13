import { describe, expect, it } from 'vitest';
import { canSelectService, groupServices } from './service-catalogue';
import { emptyCatalog, type Catalog, type Service } from './domain';
import { entitySchema } from './admin-config';
const service = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Prestation',
  category_id: 'category',
  published: true,
  archived: false,
  bookable: true,
  duration_minutes: 30,
  service_type: 'appointment',
} as Service;
const catalog = {
  ...emptyCatalog,
  settings: { booking_enabled: true },
  cities: [{ id: 'city' }],
  service_cities: [{ service_id: service.id, city_id: 'city' }],
} as Catalog;
describe('official catalogue compatibility', () => {
  it('offers selection only for configured appointments and keeps rentals/unknown durations enquiry-only', () => {
    expect(canSelectService(service, catalog)).toBe(true);
    expect(
      canSelectService({ ...service, duration_minutes: null }, catalog),
    ).toBe(false);
    expect(
      canSelectService({ ...service, service_type: 'rental' }, catalog),
    ).toBe(false);
    expect(canSelectService({ ...service, published: false }, catalog)).toBe(
      false,
    );
    expect(canSelectService({ ...service, bookable: false }, catalog)).toBe(
      false,
    );
    expect(canSelectService(service, { ...catalog, service_cities: [] })).toBe(
      false,
    );
  });
  it('groups nail and Kerfactor options without changing service identities', () => {
    const rows = [
      { ...service, subcategory: 'Onglerie', service_group: 'Gel' },
      { ...service, id: 'two', subcategory: 'Onglerie', service_group: 'BIAB' },
    ];
    expect(groupServices(rows).map((g) => g.group)).toEqual(['Gel', 'BIAB']);
    expect(groupServices(rows)[0].services[0]).toBe(rows[0]);
  });
  it('the existing admin schema accepts a genuinely unknown duration', () => {
    const result =
      entitySchema('services').shape.duration_minutes.safeParse(null);
    expect(result.success).toBe(true);
    expect(
      entitySchema('services').shape.duration_minutes.safeParse(0).success,
    ).toBe(false);
  });
});
