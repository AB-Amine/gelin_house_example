import { describe, it, expect } from 'vitest';
import {
  bookingSchema,
  contactSchema,
  currentPrice,
  discountMinor,
  emptyCatalog,
  localInstant,
  phoneSchema,
  priceLabel,
  transitions,
  type Service,
} from './domain';
const service: Service = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Test only',
  slug: 'test',
  category_id: null,
  description: '',
  preparation: '',
  duration_minutes: 60,
  buffer_before: 10,
  buffer_after: 5,
  price_type: 'fixed',
  price_minor: 10001,
  published: true,
  archived: false,
  bookable: true,
  featured: false,
  position: 0,
};
describe('exact pricing and promotions', () => {
  it('announces future promotions without applying their discount before the start', () => {
    const starts = Date.parse('2026-11-14T17:34:00Z');
    const catalog = {
      ...emptyCatalog,
      as_of: starts - 1,
      promotions: [
        {
          id: 'upcoming',
          name: 'TEST upcoming',
          description: '',
          terms: '',
          kind: 'percentage' as const,
          value: 20,
          active: true,
          starts_at: new Date(starts).toISOString(),
          ends_at: '2026-11-20T17:34:00Z',
        },
      ],
      promotion_services: [
        { promotion_id: 'upcoming', service_id: service.id },
      ],
    };
    expect(currentPrice(service, catalog)).toEqual({
      amount: 10001,
      promotion: null,
    });
    expect(currentPrice(service, catalog, starts).amount).toBe(8001);
    expect(
      currentPrice(service, catalog, Date.parse('2026-11-20T17:34:00Z'))
        .promotion,
    ).toBeNull();
  });
  it('uses integer centimes and rounds half-up', () => {
    expect(discountMinor(10001, 'percentage', 15)).toBe(1500);
    expect(discountMinor(105, 'percentage', 10)).toBe(11);
  });
  it('never discounts below zero and rejects malformed amounts', () => {
    expect(discountMinor(100, 'fixed', 999)).toBe(100);
    expect(() => discountMinor(100, 'percentage', 101)).toThrow();
    expect(() => discountMinor(1.2, 'fixed', 1)).toThrow();
  });
  it('selects the best eligible active discount without stacking', () => {
    const base = {
      description: '',
      terms: '',
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: '2027-01-01T00:00:00Z',
      active: true,
    };
    const catalog = {
      ...emptyCatalog,
      promotions: [
        { ...base, id: 'a', name: 'A', kind: 'percentage' as const, value: 10 },
        { ...base, id: 'b', name: 'B', kind: 'fixed' as const, value: 2000 },
        {
          ...base,
          id: 'c',
          name: 'C',
          kind: 'fixed' as const,
          value: 9000,
          active: false,
        },
      ],
      promotion_services: [
        { service_id: service.id, promotion_id: 'a' },
        { service_id: service.id, promotion_id: 'b' },
        { service_id: service.id, promotion_id: 'c' },
      ],
    };
    const price = currentPrice(
      service,
      catalog,
      Date.parse('2026-11-10T12:00:00Z'),
    );
    expect(price.amount).toBe(8001);
    expect(price.promotion?.id).toBe('b');
    expect(
      currentPrice(service, catalog, Date.parse('2027-02-01T12:00:00Z')).amount,
    ).toBe(10001);
    expect(
      currentPrice(
        { ...service, id: 'other' },
        catalog,
        Date.parse('2026-11-10T12:00:00Z'),
      ).amount,
    ).toBe(10001);
  });
  it('preserves consultation uncertainty instead of inventing a zero price', () => {
    expect(
      priceLabel({ ...service, price_type: 'consultation', price_minor: null }),
    ).toBe('Sur consultation');
    expect(
      currentPrice(
        { ...service, price_type: 'consultation', price_minor: null },
        emptyCatalog,
      ).amount,
    ).toBeNull();
    expect(priceLabel({ ...service, price_type: 'starting' })).toContain(
      'À partir de',
    );
  });
});
describe('customer validation and access inputs', () => {
  it('normalizes Moroccan and international phones', () => {
    expect(phoneSchema.parse('0612345678')).toBe('+212612345678');
    expect(phoneSchema.parse('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(phoneSchema.safeParse('123').success).toBe(false);
  });
  it('allows no email, requires consent, bounds notes', () => {
    expect(
      contactSchema.safeParse({
        name: 'Test Client',
        phone: '0612345678',
        consent: true,
      }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({
        name: 'Test Client',
        phone: '0612345678',
        consent: false,
      }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({
        name: 'Test Client',
        phone: '0612345678',
        consent: true,
        notes: 'x'.repeat(2001),
      }).success,
    ).toBe(false);
  });
  it('rejects repeated services and malformed management secrets', () => {
    const input = {
      services: [service.id, service.id],
      start: '2026-12-01T10:00:00Z',
      contact: { name: 'Test Client', phone: '0612345678', consent: true },
      key: service.id,
      token: 'a'.repeat(64),
      fingerprint: 'b'.repeat(64),
    };
    expect(bookingSchema.safeParse(input).success).toBe(false);
    expect(
      bookingSchema.safeParse({
        ...input,
        services: [service.id],
        token: 'guessable',
      }).success,
    ).toBe(false);
  });
});
describe('state and timezone rules', () => {
  it('keeps terminal statuses terminal', () => {
    for (const status of [
      'completed',
      'rejected',
      'cancelled_by_customer',
      'cancelled_by_salon',
      'no_show',
    ] as const)
      expect(transitions[status]).toEqual([]);
    expect(transitions.pending).not.toContain('completed');
  });
  it('uses Casablanca timezone rules rather than a fixed offset', () => {
    expect(localInstant('2026-01-15', '10:00')).toBe('2026-01-15T09:00:00Z');
    expect(localInstant('2026-03-01', '10:00')).toBe('2026-03-01T10:00:00Z');
  });
  it('rejects nonexistent and ambiguous clock-change times', () => {
    expect(() => localInstant('2026-03-22', '02:30')).toThrow();
    expect(() => localInstant('2026-02-15', '02:30')).toThrow();
  });
});
