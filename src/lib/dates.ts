import { Temporal } from '@js-temporal/polyfill';
import { localInstant, TIMEZONE } from './domain';
export function businessToday(timezone=TIMEZONE) {
  return Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString();
}
export function dateRange(from?: string, to?: string, days = 30,timezone=TIMEZONE) {
  const today = businessToday(timezone);
  let start = from ?? today,
    end = to ?? Temporal.PlainDate.from(today).add({ days }).toString();
  try {
    Temporal.PlainDate.from(start);
    Temporal.PlainDate.from(end);
    if (
      Temporal.PlainDate.compare(start, end) > 0 ||
      Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(end)).days >
        365
    )
      throw Error();
  } catch {
    start = today;
    end = Temporal.PlainDate.from(today).add({ days }).toString();
  }
  return {
    from: start,
    to: end,
    start: localInstant(start, '00:00',timezone),
    end: localInstant(
      Temporal.PlainDate.from(end).add({ days: 1 }).toString(),
      '00:00',
      timezone,
    ),
  };
}
