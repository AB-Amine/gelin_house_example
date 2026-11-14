'use client';

import {
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Temporal } from '@js-temporal/polyfill';
import { Calendar, type CalendarEntry } from './calendar';
import { useI18n } from './locale-provider';
import { AdminIcon } from './admin-icon';
import styles from './admin-calendar.module.css';
import {
  salonDaySchedule,
  scheduleLabel,
  startWithinSchedule,
} from '@/lib/salon-schedule';

type Props = ComponentProps<typeof Calendar> & {
  today: string;
  children: ReactNode;
  failed?: boolean;
  limited?: boolean;
};
const hourHeight = 72;
const cardHeight = 56;

export function AdminCalendar({
  children,
  today,
  failed,
  limited,
  ...calendar
}: Props) {
  const {
    window: period,
    rows,
    timezone = 'Africa/Casablanca',
    preview,
  } = calendar;
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const detailed = params.get('display') === 'details';
  const [selected, setSelected] = useState('');
  const [mobileDay, setMobileDay] = useState('');
  const anchor = Temporal.PlainDate.from(period.anchor);
  const days =
    period.view === 'day'
      ? [anchor.toString()]
      : Array.from({ length: 7 }, (_, i) =>
          anchor
            .subtract({ days: anchor.dayOfWeek - 1 })
            .add({ days: i })
            .toString(),
        );
  const focusDay = days.includes(mobileDay)
    ? mobileDay
    : days.includes(today)
      ? today
      : period.anchor;
  const local = (row: CalendarEntry) =>
    row.local_start
      ? Temporal.PlainDateTime.from(row.local_start)
      : Temporal.Instant.from(row.starts_at)
          .toZonedDateTimeISO(timezone)
          .toPlainDateTime();
  const entries = rows
    .map((row) => ({ row, start: local(row) }))
    .filter(({ start }) => days.includes(start.toPlainDate().toString()))
    .sort((a, b) => Temporal.PlainDateTime.compare(a.start, b.start));
  const selectedRow = entries.find(
    ({ row }) => row.reference === selected,
  )?.row;
  // Card height is presentation only; it never represents or reserves a duration.
  const schedule = {
    hours: calendar.hours,
    exceptions: calendar.exceptions,
    closures: calendar.closures,
  };
  const daySchedules = days.map((day) => salonDaySchedule(day, schedule));
  const starts = [
    ...daySchedules.flatMap((intervals) =>
      intervals.map((row) => Math.floor(row.start / 60)),
    ),
    ...entries.map(({ start }) => start.hour),
  ];
  const ends = [
    ...daySchedules.flatMap((intervals) =>
      intervals.map((row) => Math.ceil(row.end / 60)),
    ),
    ...entries.map(({ start }) => start.hour + 1),
  ];
  const firstHour = starts.length ? Math.min(...starts) : 0;
  const lastHour = ends.length ? Math.min(24, Math.max(...ends)) : 0;
  const hours = Array.from(
    { length: lastHour - firstHour },
    (_, i) => firstHour + i,
  );
  function href(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    return `${pathname}?${next}`;
  }
  function switchDisplay(display: string) {
    if (display === 'calendar' && ['month', 'list'].includes(period.view)) {
      router.replace(href({ display, view: 'week' }), { scroll: false });
      return;
    }
    window.history.replaceState(null, '', href({ display }));
  }
  const labelDate = (day: string, options: Intl.DateTimeFormatOptions) =>
    Temporal.PlainDate.from(day).toLocaleString('fr-MA', options);
  const shift = period.view === 'day' ? 1 : 7;
  function dayCards(day: string) {
    const dayEntries = entries.filter(
      ({ start }) => start.toPlainDate().toString() === day,
    );
    const laneEnds: number[] = [];
    const cards = dayEntries.map((entry) => {
      const top =
        (entry.start.hour -
          firstHour +
          entry.start.minute / 60 +
          entry.start.second / 3600) *
        hourHeight;
      let lane = laneEnds.findIndex((end) => end <= top);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = top + cardHeight + 4;
      return { ...entry, top, lane };
    });
    return (
      <div
        className={styles.dayColumn}
        data-day={day}
        data-focused={day === focusDay}
        data-today={day === today}
        data-unknown={calendar.scheduleUnavailable}
        style={{ height: Math.max(90, hours.length * hourHeight) }}
      >
        {!calendar.scheduleUnavailable &&
          salonDaySchedule(day, schedule).map((interval) => (
            <div
              aria-hidden
              key={interval.start}
              className={styles.openInterval}
              style={{
                top: (interval.start / 60 - firstHour) * hourHeight,
                height: ((interval.end - interval.start) / 60) * hourHeight,
              }}
            />
          ))}
        {!cards.length && (
          <p className={styles.emptyDay}>
            {calendar.scheduleUnavailable
              ? 'Aucun rendez-vous'
              : salonDaySchedule(day, schedule).length
                ? 'Aucun rendez-vous'
                : 'Salon fermé'}
          </p>
        )}
        {cards.map(({ row, start, top, lane }) => (
          <button
            key={row.reference}
            type="button"
            className={styles.event}
            data-status={row.status}
            data-outside={
              !calendar.scheduleUnavailable &&
              !startWithinSchedule(start.toString(), schedule)
            }
            aria-pressed={selected === row.reference}
            onClick={() => setSelected(row.reference)}
            style={{
              top,
              left: `calc(${(lane * 100) / laneEnds.length}% + 3px)`,
              width: `calc(${100 / laneEnds.length}% - 6px)`,
              height: cardHeight,
            }}
            aria-label={`${row.customers?.name ?? 'Cliente'} · ${start.toPlainTime().toString().slice(0, 5)} · ${t(`status.${row.status}`)}${calendar.scheduleUnavailable || startWithinSchedule(start.toString(), schedule) ? '' : ' · Hors horaires du salon'}`}
            title={`${row.customers?.name ?? 'Cliente'} · ${start.toPlainTime().toString().slice(0, 5)} · ${t(`status.${row.status}`)}${calendar.scheduleUnavailable || startWithinSchedule(start.toString(), schedule) ? '' : ' · Hors horaires du salon'}`}
          >
            <span className={styles.eventTime}>
              {!calendar.scheduleUnavailable &&
                !startWithinSchedule(start.toString(), schedule) && (
                  <span aria-label="Hors horaires">!</span>
                )}
              {start.toPlainTime().toString().slice(0, 5)}{' '}
              <span className={styles.statusDot} aria-hidden />
            </span>
            <strong>{row.customers?.name ?? 'Cliente'}</strong>
            <span className={styles.srOnly}>{t(`status.${row.status}`)}</span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={styles.workspace}>
      <div
        className={styles.switcher}
        role="group"
        aria-label="Présentation du calendrier"
      >
        <button
          type="button"
          aria-pressed={!detailed}
          onClick={() => switchDisplay('calendar')}
        >
          <AdminIcon name="bookings" /> Vue calendrier
        </button>
        <button
          type="button"
          aria-pressed={detailed}
          onClick={() => switchDisplay('details')}
        >
          <AdminIcon name="clock" /> Vue détaillée
        </button>
      </div>
      <div hidden={!detailed}>{children}</div>
      {!detailed && (
        <section aria-label="Calendrier visuel" className={styles.visual}>
          <header className={styles.heading}>
            <div>
              <h1>Rendez-vous</h1>
              <p>Votre agenda, simplement.</p>
            </div>
            <Link
              className="button"
              href={
                preview
                  ? '/admin/preview?section=bookings&new=1'
                  : '/admin/appointments/new'
              }
            >
              + Ajouter un rendez-vous
            </Link>
          </header>
          {calendar.scheduleUnavailable && (
            <p className="notice" role="alert">
              Horaires indisponibles. Les rendez-vous restent affichés ;
              vérifiez les horaires avant de choisir une heure.
            </p>
          )}
          <div className={styles.controls}>
            <div className={styles.periodNav}>
              <Link
                className={styles.arrow}
                href={href({
                  date: anchor.subtract({ days: shift }).toString(),
                  view: period.view === 'day' ? 'day' : 'week',
                })}
                aria-label={
                  shift === 1 ? 'Jour précédent' : 'Semaine précédente'
                }
              >
                ‹
              </Link>
              <h2>
                {period.view === 'day'
                  ? labelDate(period.anchor, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : `${labelDate(days[0], { day: 'numeric', month: 'long' })} — ${labelDate(days[6], { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </h2>
              <Link
                className={styles.arrow}
                href={href({
                  date: anchor.add({ days: shift }).toString(),
                  view: period.view === 'day' ? 'day' : 'week',
                })}
                aria-label={shift === 1 ? 'Jour suivant' : 'Semaine suivante'}
              >
                ›
              </Link>
            </div>
            <div className={styles.viewControls}>
              <Link
                className="button secondary"
                href={href({
                  date: today,
                  view: period.view === 'day' ? 'day' : 'week',
                })}
              >
                Aujourd’hui
              </Link>
              <div
                className={styles.rangeSwitcher}
                aria-label="Période du calendrier"
              >
                <Link
                  aria-current={period.view === 'day' ? 'page' : undefined}
                  href={href({ view: 'day' })}
                >
                  Jour
                </Link>
                <Link
                  aria-current={period.view !== 'day' ? 'page' : undefined}
                  href={href({ view: 'week' })}
                >
                  Semaine
                </Link>
              </div>
            </div>
          </div>
          {calendar.query && (
            <p className={styles.filterNotice}>
              Recherche conservée : « {calendar.query} »{' '}
              <Link href={href({ q: '' })}>Effacer</Link>
            </p>
          )}
          {limited && (
            <p className="notice">
              Affichage limité à 500 rendez-vous. Affinez la période ou la
              recherche dans la vue détaillée.
            </p>
          )}
          {failed ? (
            <p className="error" role="alert">
              Impossible de charger les rendez-vous. Réessayez depuis la vue
              détaillée.
            </p>
          ) : (
            <>
              <div
                className={styles.mobileDates}
                role="group"
                aria-label="Jour à afficher"
              >
                {days.map((day) => (
                  <button
                    type="button"
                    key={day}
                    aria-pressed={day === focusDay}
                    onClick={() => setMobileDay(day)}
                  >
                    {labelDate(day, { weekday: 'short' })}
                    <strong>{Temporal.PlainDate.from(day).day}</strong>
                  </button>
                ))}
              </div>
              <div className={styles.layout}>
                <div
                  className={styles.planner}
                  style={
                    {
                      '--days': days.length,
                      '--hour-height': `${hourHeight}px`,
                    } as CSSProperties
                  }
                >
                  <div
                    className={styles.scrollGrid}
                    tabIndex={0}
                    role="region"
                    aria-label="Heures et rendez-vous"
                  >
                    <div className={styles.gridHeader}>
                      <span aria-hidden />
                      <div className={styles.dayHeaders}>
                        {days.map((day) => (
                          <div
                            key={day}
                            data-focused={day === focusDay}
                            data-today={day === today}
                          >
                            <span>{labelDate(day, { weekday: 'short' })}</span>
                            <strong>{Temporal.PlainDate.from(day).day}</strong>
                            <small>
                              {calendar.scheduleUnavailable
                                ? 'Horaires indisponibles'
                                : scheduleLabel(
                                    salonDaySchedule(day, schedule),
                                  )}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={styles.timeGrid}>
                      <div className={styles.hours}>
                        {hours.map((hour) => (
                          <span key={hour} style={{ height: hourHeight }}>
                            {String(hour).padStart(2, '0')}:00
                          </span>
                        ))}
                      </div>
                      <div className={styles.columns}>
                        {days.map((day) => (
                          <div
                            className={styles.dayWrapper}
                            key={day}
                            data-focused={day === focusDay}
                          >
                            {dayCards(day)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <aside
                  className={styles.details}
                  aria-label="Détails du rendez-vous"
                  aria-live="polite"
                >
                  <h2>
                    {selectedRow ? 'Rendez-vous sélectionné' : 'Votre planning'}
                  </h2>
                  {selectedRow ? (
                    <>
                      <div className={styles.customer}>
                        <AdminIcon name="user" />
                        <h3>{selectedRow.customers?.name ?? 'Cliente'}</h3>
                        {selectedRow.customers?.phone && (
                          <a href={`tel:${selectedRow.customers.phone}`}>
                            {selectedRow.customers.phone}
                          </a>
                        )}
                      </div>
                      <dl>
                        {!calendar.scheduleUnavailable &&
                          !startWithinSchedule(
                            local(selectedRow).toString(),
                            schedule,
                          ) && (
                            <div
                              className={styles.scheduleWarning}
                              role="status"
                            >
                              <dt>Hors horaires du salon</dt>
                              <dd>
                                Ce rendez-vous est conservé ; vérifiez-le avec
                                la cliente.
                              </dd>
                            </div>
                          )}
                        <dt>Prestations</dt>
                        <dd>
                          {selectedRow.appointment_items
                            .map((item) => item.name)
                            .join(' · ') || 'Non renseignées'}
                        </dd>
                        <dt>Date et heure de début</dt>
                        <dd>
                          {labelDate(
                            local(selectedRow).toPlainDate().toString(),
                            {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            },
                          )}{' '}
                          à{' '}
                          {local(selectedRow)
                            .toPlainTime()
                            .toString()
                            .slice(0, 5)}
                        </dd>
                        <dt>Statut</dt>
                        <dd>
                          <span
                            className={styles.status}
                            data-status={selectedRow.status}
                          >
                            {t(`status.${selectedRow.status}`)}
                          </span>
                        </dd>
                        <dt>Référence</dt>
                        <dd>{selectedRow.reference}</dd>
                      </dl>
                      <Link
                        className="button"
                        href={
                          preview
                            ? `/admin/preview?section=appointments&reference=${encodeURIComponent(selectedRow.reference)}`
                            : `/admin/bookings?reference=${encodeURIComponent(selectedRow.reference)}`
                        }
                      >
                        Ouvrir · Modifier / Annuler →
                      </Link>
                      <p>
                        Les actions restent disponibles dans la fiche du
                        rendez-vous.
                      </p>
                    </>
                  ) : (
                    <>
                      <AdminIcon name="bookings" />
                      <p>
                        Sélectionnez un rendez-vous pour consulter ses
                        informations.
                      </p>
                      <p>
                        {entries.length
                          ? `${entries.length} rendez-vous sur cette période.`
                          : 'Aucun rendez-vous sur cette période.'}
                      </p>
                    </>
                  )}
                </aside>
              </div>
              <footer className={styles.legend}>
                <span>
                  <i data-status="pending" /> À confirmer
                </span>
                <span>
                  <i data-status="confirmed" /> Confirmé
                </span>
                <span>
                  <i data-status="completed" /> Terminé
                </span>
                {!calendar.scheduleUnavailable && (
                  <span>Zones grisées : salon fermé</span>
                )}
                <p>
                  {timezone} · Agenda par heure de début, sans durée réservée
                  automatiquement.
                </p>
              </footer>
            </>
          )}
        </section>
      )}
    </div>
  );
}
