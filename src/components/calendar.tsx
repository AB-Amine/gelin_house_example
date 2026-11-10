import Link from 'next/link';
import { Temporal } from '@js-temporal/polyfill';
import { type calendarWindow } from '@/lib/calendar';
import { dateLabel, timeLabel, statusLabels, type Status } from '@/lib/domain';
export type CalendarEntry = {
  reference: string;
  starts_at: string;
  ends_at: string;
  status: Status;
  customers: { name: string; phone: string } | null;
  appointment_items: {
    name: string;
    resource_id: string;
    resources: { name: string } | null;
  }[];
};
type Closure = {
  starts_at: string;
  ends_at: string;
  reason: string;
  resource_id: string | null;
};
type Hours = {
  resource_id: string | null;
  weekday: number;
  opens: string;
  closes: string;
};
type Exception = {
  resource_id: string | null;
  day: string;
  opens: string;
  closes: string;
};
const businessDate = (instant: string) =>
  Temporal.Instant.from(instant)
    .toZonedDateTimeISO('Africa/Casablanca')
    .toPlainDate()
    .toString();
export function Calendar({
  window: period,
  rows,
  closures,
  hours,
  exceptions,
  resource,
  query,
  preview = false,
}: {
  window: ReturnType<typeof calendarWindow>;
  rows: CalendarEntry[];
  closures: Closure[];
  hours: Hours[];
  exceptions: Exception[];
  resource: string;
  query: string;
  preview?: boolean;
}) {
  function dayLink(day: string) {
    return `${preview ? '/admin/preview' : '/admin/calendar'}?${new URLSearchParams({ ...(preview ? { section: 'calendar' } : {}), date: day, view: 'day', resource, q: query })}`;
  }
  function intervals(day: string, id: string | null) {
    const overrides = exceptions.filter(
      (h) => h.resource_id === id && h.day === day,
    );
    return overrides.length
      ? overrides
      : hours.filter(
          (h) =>
            h.resource_id === id &&
            h.weekday === Temporal.PlainDate.from(day).dayOfWeek % 7,
        );
  }
  function events(day: string, compact = false) {
    const appointments = rows.filter((a) => businessDate(a.starts_at) === day);
    const dayClosures = closures.filter(
      (c) =>
        businessDate(c.starts_at) <= day &&
        businessDate(c.ends_at) >= day &&
        (!resource || c.resource_id === null || c.resource_id === resource),
    );
    const opening = intervals(day, null);
    return (
      <>
        <p className="calendar-hours">
          {opening.length
            ? opening
                .map((h) => `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}`)
                .join(' / ')
            : 'Salon fermé'}
          {resource && (
            <>
              {' '}
              · Équipe :{' '}
              {intervals(day, resource)
                .map((h) => `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}`)
                .join(' / ') || 'Indisponible'}
            </>
          )}
        </p>
        {dayClosures.map((c, i) => (
          <div className="calendar-block" key={i}>
            Indisponible · {c.reason}
            <small>
              {dateLabel(c.starts_at)} → {dateLabel(c.ends_at)}
            </small>
          </div>
        ))}
        {(compact ? appointments.slice(0, 3) : appointments).map((a) => (
          <Link
            href={
              preview
                ? `/admin/preview?section=appointments&reference=${a.reference}`
                : `/admin/appointments?reference=${a.reference}`
            }
            className={`calendar-event status-${a.status}`}
            key={a.reference}
          >
            <strong>
              {timeLabel(a.starts_at)}
              {!compact && ` → ${timeLabel(a.ends_at)}`}
            </strong>
            <span>{a.customers?.name ?? 'Cliente'}</span>
            <small>{statusLabels[a.status]}</small>
            {!compact && (
              <>
                <small>
                  {a.appointment_items.map((i) => i.name).join(' · ')}
                </small>
                <small>
                  {a.appointment_items
                    .flatMap((i) =>
                      i.resources?.name ? [i.resources.name] : [],
                    )
                    .join(' · ')}
                </small>
              </>
            )}
          </Link>
        ))}
        {compact && appointments.length > 3 && (
          <Link className="text-link" href={dayLink(day)}>
            + {appointments.length - 3} rendez-vous
          </Link>
        )}
        {!appointments.length && !compact && (
          <p className="small">Aucun rendez-vous.</p>
        )}
      </>
    );
  }
  if (period.view === 'month' || period.view === 'week')
    return (
      <div
        className="calendar-scroll"
        tabIndex={0}
        role="region"
        aria-label={`Calendrier ${period.view === 'month' ? 'mensuel' : 'hebdomadaire'}`}
      >
        <div className={`calendar-grid ${period.view}`}>
          {[
            'Lundi',
            'Mardi',
            'Mercredi',
            'Jeudi',
            'Vendredi',
            'Samedi',
            'Dimanche',
          ].map((day) => (
            <div className="calendar-weekday" key={day}>
              {day}
            </div>
          ))}
          {period.view === 'month' &&
            Array.from({ length: period.leading }, (_, i) => (
              <div className="calendar-cell empty-day" key={`empty-${i}`} />
            ))}
          {period.days.map((day) => (
            <section className="calendar-cell" key={day}>
              <Link className="calendar-date" href={dayLink(day)}>
                {Temporal.PlainDate.from(day).day}
                {period.view === 'week' &&
                  ` / ${Temporal.PlainDate.from(day).month}`}
              </Link>
              {events(day, period.view === 'month')}
            </section>
          ))}
        </div>
      </div>
    );
  return (
    <div className="record-list">
      {period.days
        .filter(
          (day) =>
            period.view === 'day' ||
            rows.some((a) => businessDate(a.starts_at) === day) ||
            closures.some(
              (c) =>
                businessDate(c.starts_at) <= day &&
                businessDate(c.ends_at) >= day,
            ),
        )
        .map((day) => (
          <section className="record" key={day}>
            <h2>
              {Temporal.PlainDate.from(day).toLocaleString('fr-MA', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
            {events(day)}
          </section>
        ))}
      {period.view === 'list' && !rows.length && (
        <p className="empty-state">Aucun rendez-vous sur cette période.</p>
      )}
    </div>
  );
}
