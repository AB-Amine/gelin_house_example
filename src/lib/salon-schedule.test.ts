import { describe, expect, it } from 'vitest';
import {
  salonDaySchedule,
  scheduleLabel,
  startWithinSchedule,
  type SalonSchedule,
} from './salon-schedule';

describe('salon schedule presentation', () => {
  const schedule: SalonSchedule = {
    hours: [
      { resource_id: null, weekday: 1, opens: '10:15', closes: '13:00' },
      { resource_id: null, weekday: 1, opens: '14:30', closes: '21:45' },
      { resource_id: null, weekday: 2, opens: '11:00', closes: '19:00' },
      { resource_id: 'staff', weekday: 3, opens: '09:00', closes: '18:00' },
    ],
    exceptions: [
      { resource_id: null, day: '2026-11-17', opens: '12:00', closes: '16:00' },
    ],
    closures: [
      {
        resource_id: null,
        starts_at: '2026-11-16T14:00:00Z',
        ends_at: '2026-11-16T15:00:00Z',
        local_start: '2026-11-16T15:00',
        local_end: '2026-11-16T16:00',
        reason: 'Fermeture partielle',
      },
    ],
  };
  it('uses different weekday hours and preserves split shifts and partial closures', () => {
    expect(scheduleLabel(salonDaySchedule('2026-11-16', schedule))).toBe(
      '10:15–13:00 · 14:30–15:00 · 16:00–21:45',
    );
    expect(startWithinSchedule('2026-11-16T13:30', schedule)).toBe(false);
    expect(startWithinSchedule('2026-11-16T15:30', schedule)).toBe(false);
    expect(startWithinSchedule('2026-11-16T16:00', schedule)).toBe(true);
    expect(startWithinSchedule('2026-11-16T21:45', schedule)).toBe(false);
  });
  it('replaces weekday hours with exceptions and does not treat staff hours as salon opening', () => {
    expect(scheduleLabel(salonDaySchedule('2026-11-17', schedule))).toBe(
      '12:00–16:00',
    );
    expect(scheduleLabel(salonDaySchedule('2026-11-18', schedule))).toBe(
      'Fermé',
    );
    expect(startWithinSchedule('2026-11-17T11:00', schedule)).toBe(false);
  });
  it('reflects edits without changing schedule data or stored appointments', () => {
    const original = JSON.stringify(schedule);
    const updated = {
      ...schedule,
      hours: schedule.hours.map((row) => ({ ...row, closes: '12:00' })),
    };
    expect(startWithinSchedule('2026-11-16T12:30', updated)).toBe(false);
    expect(startWithinSchedule('2026-11-16T12:30', schedule)).toBe(true);
    expect(JSON.stringify(schedule)).toBe(original);
  });
  it('handles full-day closures through midnight with exclusive end boundaries', () => {
    const closed = {
      ...schedule,
      closures: [
        {
          resource_id: null,
          starts_at: '2026-11-15T23:00:00Z',
          ends_at: '2026-11-16T23:00:00Z',
          local_start: '2026-11-16T00:00',
          local_end: '2026-11-17T00:00',
          reason: 'Fermé',
        },
      ],
    };
    expect(salonDaySchedule('2026-11-16', closed)).toEqual([]);
    expect(scheduleLabel(salonDaySchedule('2026-11-17', closed))).toBe(
      '12:00–16:00',
    );
  });
});
