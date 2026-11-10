import { describe, it, expect } from 'vitest';
import { calendarWindow } from './calendar';
describe('calendar period navigation', () => {
  it('uses complete Monday-to-Sunday weeks', () => {
    const period = calendarWindow('2026-11-10', 'week');
    expect(period.from).toBe('2026-11-09');
    expect(period.to).toBe('2026-11-15');
    expect(period.days).toHaveLength(7);
    expect(period.previous).toBe('2026-11-03');
  });
  it('handles month length and leap years', () => {
    const feb = calendarWindow('2028-02-15', 'month');
    expect(feb.days).toHaveLength(29);
    expect(feb.from).toBe('2028-02-01');
    expect(feb.to).toBe('2028-02-29');
    expect(calendarWindow('2026-11-10', 'month').leading).toBe(6);
  });
  it('uses actual timezone day bounds across clock changes', () => {
    const day = calendarWindow('2026-03-22', 'day');
    expect(Date.parse(day.end) - Date.parse(day.start)).toBe(23 * 3600000);
    expect(calendarWindow('2026-11-10', 'list').days).toHaveLength(30);
  });
});
