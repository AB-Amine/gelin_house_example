import { Temporal } from '@js-temporal/polyfill';

export type SalonHours = {
  resource_id: string | null;
  weekday: number;
  opens: string;
  closes: string;
};
export type SalonException = {
  resource_id: string | null;
  day: string;
  opens: string;
  closes: string;
};
export type SalonClosure = {
  resource_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string;
  local_start?: string;
  local_end?: string;
};
export type SalonSchedule = {
  hours: SalonHours[];
  exceptions: SalonException[];
  closures: SalonClosure[];
};
export type OpeningInterval = { start: number; end: number };
export const salonTimezone = 'Africa/Casablanca';
export function minuteOfDay(value: string) {
  if (/^24:00(?::00)?$/.test(value)) return 1440;
  const time = Temporal.PlainTime.from(value);
  return time.hour * 60 + time.minute + time.second / 60;
}
export function scheduleTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
}
// Display the existing salon_start_open rules; never reserve or modify a start.
export function salonDaySchedule(
  day: string,
  schedule: SalonSchedule,
): OpeningInterval[] {
  const date = Temporal.PlainDate.from(day);
  const exceptions = schedule.exceptions.filter(
    (row) => row.resource_id === null && row.day === day,
  );
  const source = exceptions.length
    ? exceptions
    : schedule.hours.filter(
        (row) => row.resource_id === null && row.weekday === date.dayOfWeek % 7,
      );
  let intervals = source
    .map((row) => ({
      start: minuteOfDay(row.opens),
      end: minuteOfDay(row.closes),
    }))
    .filter((row) => row.end > row.start)
    .sort((a, b) => a.start - b.start);
  for (const closure of schedule.closures.filter(
    (row) => row.resource_id === null,
  )) {
    const start =
      closure.local_start ??
      Temporal.Instant.from(closure.starts_at)
        .toZonedDateTimeISO(salonTimezone)
        .toPlainDateTime()
        .toString();
    const end =
      closure.local_end ??
      Temporal.Instant.from(closure.ends_at)
        .toZonedDateTimeISO(salonTimezone)
        .toPlainDateTime()
        .toString();
    if (start.slice(0, 10) > day || end.slice(0, 10) < day) continue;
    const from = start.slice(0, 10) < day ? 0 : minuteOfDay(start.slice(11));
    const to = end.slice(0, 10) > day ? 1440 : minuteOfDay(end.slice(11));
    intervals = intervals.flatMap((interval) =>
      to <= interval.start || from >= interval.end
        ? [interval]
        : [
            { start: interval.start, end: Math.max(interval.start, from) },
            { start: Math.min(interval.end, to), end: interval.end },
          ].filter((row) => row.end > row.start),
    );
  }
  return intervals.reduce<OpeningInterval[]>((merged, interval) => {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end)
      previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
    return merged;
  }, []);
}
export function scheduleLabel(intervals: OpeningInterval[]) {
  return intervals.length
    ? intervals
        .map((row) => `${scheduleTime(row.start)}–${scheduleTime(row.end)}`)
        .join(' · ')
    : 'Fermé';
}
export function startWithinSchedule(
  localStart: string,
  schedule: SalonSchedule,
) {
  const minutes = minuteOfDay(localStart.slice(11));
  return salonDaySchedule(localStart.slice(0, 10), schedule).some(
    (row) => minutes >= row.start && minutes < row.end,
  );
}
