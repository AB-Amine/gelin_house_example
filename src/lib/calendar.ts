import { Temporal } from '@js-temporal/polyfill';
import { businessToday, dateRange } from './dates';
export type CalendarView = 'day' | 'week' | 'month' | 'list';
export function calendarWindow(input?: string, mode?: string) {
  let anchor: Temporal.PlainDate;
  try {
    anchor = Temporal.PlainDate.from(input ?? businessToday());
  } catch {
    anchor = Temporal.PlainDate.from(businessToday());
  }
  const view: CalendarView = ['day', 'week', 'month', 'list'].includes(
    mode ?? '',
  )
    ? (mode as CalendarView)
    : 'day';
  let first = anchor,
    last = anchor;
  if (view === 'week') {
    first = anchor.subtract({ days: anchor.dayOfWeek - 1 });
    last = first.add({ days: 6 });
  }
  if (view === 'month') {
    first = anchor.with({ day: 1 });
    last = first.add({ months: 1 }).subtract({ days: 1 });
  }
  if (view === 'list') last = first.add({ days: 29 });
  const days: string[] = [];
  for (
    let d = first;
    Temporal.PlainDate.compare(d, last) <= 0;
    d = d.add({ days: 1 })
  )
    days.push(d.toString());
  const shift =
    view === 'month'
      ? { months: 1 }
      : { days: view === 'week' ? 7 : view === 'list' ? 30 : 1 };
  return {
    ...dateRange(first.toString(), last.toString()),
    anchor: anchor.toString(),
    view,
    days,
    leading: first.dayOfWeek - 1,
    previous: anchor.subtract(shift).toString(),
    next: anchor.add(shift).toString(),
  };
}
