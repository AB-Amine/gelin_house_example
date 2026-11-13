import { describe, expect, it } from 'vitest';
import {
  adminSection,
  adminSections,
  newSlug,
  promotionState,
  toMinor,
} from './admin-ui';
describe('salon administration', () => {
  it('converts owner-entered currency amounts exactly and rejects invalid amounts', () => {
    expect(toMinor('150')).toBe(15000);
    expect(toMinor('150,25')).toBe(15025);
    expect(toMinor('0.29')).toBe(29);
    expect(toMinor('0')).toBe(0);
    for (const value of ['-1', '1.001', '', '1e4', 'Infinity', '1000000.01'])
      expect(() => toMinor(value)).toThrow();
  });
  it('retains six main destinations and separates registered clients', () => {
    expect(adminSections).toHaveLength(6);
    expect(adminSection('clients')).toBe('clients');
    expect(adminSection('appointments')).toBe('bookings');
    expect(adminSection('requests')).toBe('bookings');
    expect(adminSection('categories')).toBe('services');
    expect(adminSection('eligibility')).toBe('promotions');
    expect(adminSection('closures')).toBe('settings');
  });
  it('builds usable distinct slugs without relying on Latin service names', () => {
    expect(newSlug('Beauté du visage', 'abc')).toBe('beaute-du-visage-abc');
    expect(newSlug('مكياج', 'xyz')).toBe('prestation-xyz');
  });
  it('derives offer visibility including expiry and exhausted uses', () => {
    const offer = {
      active: true,
      starts_at: '2026-01-01',
      ends_at: '2026-12-01',
    };
    const now = Date.parse('2026-06-01');
    expect(promotionState(offer, now)).toBe('Active');
    expect(promotionState({ ...offer, active: false }, now)).toBe('Désactivée');
    expect(promotionState(offer, Date.parse('2026-12-01'))).toBe('Expirée');
    expect(promotionState(offer, Date.parse('2025-01-01'))).toBe('Programmée');
    expect(promotionState({ ...offer, max_uses: 1, usage_count: 1 }, now)).toBe(
      'Épuisée',
    );
  });
});
