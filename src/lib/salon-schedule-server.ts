import 'server-only';
import { Temporal } from '@js-temporal/polyfill';
import { salonTimezone, type SalonClosure } from './salon-schedule';

// Serialize salon wall times on the server, like appointment local_start.
export function localizeSalonClosures(rows: SalonClosure[]) {
  return rows.map((row) => ({
    ...row,
    local_start: Temporal.Instant.from(row.starts_at)
      .toZonedDateTimeISO(salonTimezone)
      .toPlainDateTime()
      .toString(),
    local_end: Temporal.Instant.from(row.ends_at)
      .toZonedDateTimeISO(salonTimezone)
      .toPlainDateTime()
      .toString(),
  }));
}
