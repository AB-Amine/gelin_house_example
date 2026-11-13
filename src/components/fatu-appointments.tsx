'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Temporal } from '@js-temporal/polyfill';
import type { AppointmentRow } from './admin';
import { transitions, type Status } from '@/lib/domain';
import { api, ApiError } from '@/lib/client';
import { useI18n } from './locale-provider';
import { AppointmentNote } from './appointment-note';
import { CustomerPrivacy } from './customer-privacy';
type Booking = AppointmentRow & {
  customer_id?: string;
  local_start?: string;
  pending_request_kind?: string | null;
  currency: string;
  city_name: string | null;
  event_address: string;
  event_details: string;
  travel_fee_minor: number;
};
export function FatuAppointments({
  rows,
  timezone,
}: {
  rows: Booking[];
  timezone: string;
}) {
  const { t, date, money } = useI18n();
  const actionLabel: Record<string, string> = {
    confirmed: 'Confirmer',
    rejected: 'Refuser',
    in_progress: 'Commencer la prestation',
    completed: 'Marquer comme terminé',
    cancelled_by_customer: 'Annuler à la demande de la cliente',
    cancelled_by_salon: 'Annuler le rendez-vous',
    no_show: 'Signaler une absence',
  };
  const router = useRouter();
  const [selected, setSelected] = useState<{
    id: string;
    action: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(() =>
    rows.length === 1 ? rows[0].id : null,
  );
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<
    Record<string, { action: string; created_at: string }[]>
  >({});
  useEffect(() => {
    if (selected)
      document
        .getElementById('appointment-action')
        ?.scrollIntoView({ block: 'center' });
  }, [selected]);
  return (
    <>
      {message && (
        <p className="error" role="alert">
          {t(message)}
        </p>
      )}
      {selected && (
        <form
          id="appointment-action"
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setMessage('');
            try {
              await api('/api/admin/appointments', {
                id: selected.id,
                action: selected.action,
                reason: data.get('reason') ?? '',
                ...(selected.action === 'reschedule'
                  ? {
                      localStart: data.get('start'),
                    }
                  : {}),
              });
              setSelected(null);
              router.refresh();
            } catch (ex) {
              setMessage(ex instanceof ApiError ? ex.message : 'common.error');
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>
            {t(
              selected.action === 'reschedule'
                ? 'client.rescheduleRequest'
                : `status.${selected.action}`,
            )}
          </h2>
          {selected.action === 'reschedule' && (
            <label>
              {t('client.proposedDate')}
              <input
                type="datetime-local"
                name="start"
                defaultValue={
                  rows.find((row) => row.id === selected.id)?.local_start ??
                  Temporal.Instant.from(
                    rows.find((row) => row.id === selected.id)!.starts_at,
                  )
                    .toZonedDateTimeISO(timezone)
                    .toPlainDateTime()
                    .toString()
                    .slice(0, 16)
                }
                required
              />
              <small>{timezone}</small>
            </label>
          )}
          <label>
            Motif (facultatif, sauf refus ou prestation déjà commencée)
            <textarea
              name="reason"
              maxLength={2000}
              required={
                (selected.action.startsWith('cancelled') &&
                  rows.find((row) => row.id === selected.id)?.status ===
                    'in_progress') ||
                selected.action === 'rejected'
              }
            />
          </label>
          <div className="inline-actions">
            <button className="button" disabled={busy}>
              {busy
                ? 'Enregistrement…'
                : selected.action.startsWith('cancelled')
                  ? 'Confirmer l’annulation'
                  : 'Enregistrer'}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
      {!!rows.length && (
        <div
          className="fatu-booking-table"
          role="region"
          tabIndex={0}
          aria-label={t('admin.bookings')}
        >
          <table>
            <thead>
              <tr>
                {[
                  'booking.reference',
                  'auth.fullName',
                  'booking.city',
                  'nav.services',
                  'booking.slot',
                  'field.status',
                  'booking.total',
                  'common.details',
                ].map((key) => (
                  <th key={key} scope="col">
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td data-label="Référence">{b.reference}</td>
                  <td data-label="Cliente">{b.customers?.name}</td>
                  <td data-label="Ville">{b.city_name ?? '—'}</td>
                  <td data-label="Prestations">
                    {b.appointment_items.map((i) => i.name).join(' · ')}
                  </td>
                  <td data-label="Date et heure">
                    {b.local_start?.replace('T', ' à ') ??
                      date(b.starts_at, { timeZone: timezone })}
                  </td>
                  <td data-label="Statut">
                    <span className={`badge status-${b.status}`}>
                      {t(
                        b.pending_request_kind === 'reschedule'
                          ? 'status.reschedule_requested'
                          : `status.${b.status}`,
                      )}
                    </span>
                  </td>
                  <td data-label="Prix estimé">
                    {b.uncertain
                      ? 'Prix à confirmer'
                      : money(b.total_minor, b.currency ?? 'MAD')}
                  </td>
                  <td data-label="Actions">
                    <button
                      className="button secondary"
                      aria-expanded={expanded === b.id}
                      onClick={() =>
                        setExpanded(expanded === b.id ? null : b.id)
                      }
                    >
                      {t('common.details')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="record-list">
        {rows
          .filter((b) => b.id === expanded)
          .map((b) => (
            <article className="record" key={b.id}>
              <div className="record-heading">
                <div>
                  <span className="badge">
                    {t(
                      b.pending_request_kind === 'reschedule'
                        ? 'status.reschedule_requested'
                        : `status.${b.status}`,
                    )}
                  </span>
                  <h2>
                    {b.customers?.name} · {b.reference}
                  </h2>
                </div>
                <time>
                  {b.local_start?.replace('T', ' à ') ??
                    date(b.starts_at, { timeZone: timezone })}
                </time>
              </div>
              <p>
                {b.city_name} · {b.event_address}
              </p>
              {b.pending_request_kind && (
                <Link
                  className="button secondary"
                  href={`/admin/requests?appointment=${b.id}`}
                >
                  Traiter la demande de modification
                </Link>
              )}
              <p>
                {b.customers?.phone && (
                  <a href={`tel:${b.customers.phone}`}>{b.customers.phone}</a>
                )}{' '}
                · {b.customers?.email}
              </p>
              <p className="prose">
                {b.notes} {b.event_details}
              </p>
              <p>
                {t('booking.total')}:{' '}
                <strong>
                  {b.uncertain
                    ? 'Prix à confirmer'
                    : money(b.total_minor, b.currency ?? 'MAD')}
                </strong>
                {b.scheduling_mode !== 'diary' && (
                  <>
                    {' '}
                    · {t('booking.travel')}:{' '}
                    {money(b.travel_fee_minor ?? 0, b.currency ?? 'MAD')}
                  </>
                )}
              </p>
              <details className="appointment-details">
                <summary>{t('common.details')}</summary>
                {b.scheduling_mode !== 'diary' && (
                  <p>
                    {t('field.ends_at')}:{' '}
                    {date(b.ends_at, { timeZone: timezone })}
                  </p>
                )}
                {b.appointment_items
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((i, k) => (
                    <div className="basket-row" key={k}>
                      <strong>
                        {i.name}
                        {b.scheduling_mode !== 'diary' && i.duration_minutes
                          ? ` · ${i.duration_minutes} min`
                          : ''}
                      </strong>
                      {b.scheduling_mode !== 'diary' && (
                        <p>
                          {date(i.starts_at, { timeZone: timezone })} →{' '}
                          {date(i.ends_at, { timeZone: timezone })}
                        </p>
                      )}
                      <p>
                        {i.final_minor === null
                          ? t('services.consultation')
                          : money(i.final_minor, b.currency ?? 'MAD')}{' '}
                        · {i.promotion_name} · {i.resources?.name}
                      </p>
                    </div>
                  ))}
                {b.appointment_items.some((i) => i.discount_minor > 0) && (
                  <p>
                    Réduction enregistrée :{' '}
                    {money(
                      b.appointment_items.reduce(
                        (sum, i) => sum + i.discount_minor,
                        0,
                      ),
                      b.currency ?? 'MAD',
                    )}
                  </p>
                )}
                <AppointmentNote id={b.id} initial={b.internal_notes ?? ''} />
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const h = await api<
                        { action: string; created_at: string }[]
                      >(`/api/admin/history?id=${b.id}`, undefined, 'GET');
                      setHistory({ ...history, [b.id]: h });
                    } catch {
                      setMessage('common.error');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t('admin.activity')}
                </button>
                {history[b.id]?.map((h, i) => (
                  <p key={i}>
                    {date(h.created_at, { timeZone: timezone })} ·{' '}
                    {t(
                      h.action === 'reschedule'
                        ? 'client.rescheduleRequest'
                        : `status.${h.action}`,
                    )}
                  </p>
                ))}
              </details>
              <div className="inline-actions">
                {transitions[b.status as Status]
                  .filter((status) =>
                    ['confirmed', 'cancelled_by_salon'].includes(status),
                  )
                  .map((status) => (
                    <button
                      className="button secondary"
                      disabled={busy}
                      key={status}
                      onClick={() => setSelected({ id: b.id, action: status })}
                    >
                      {actionLabel[status] ?? t(`status.${status}`)}
                    </button>
                  ))}
                {['pending', 'confirmed'].includes(b.status) && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      setSelected({ id: b.id, action: 'reschedule' })
                    }
                  >
                    Modifier la date ou l’heure
                  </button>
                )}
              </div>
              {b.customer_id && (
                <details className="entity-details">
                  <summary>Confidentialité de la cliente</summary>
                  <CustomerPrivacy id={b.customer_id} />
                </details>
              )}
              {transitions[b.status as Status].some(
                (status) =>
                  !['confirmed', 'cancelled_by_salon'].includes(status),
              ) && (
                <details className="entity-details">
                  <summary>Autres actions</summary>
                  <div className="inline-actions">
                    {transitions[b.status as Status]
                      .filter(
                        (status) =>
                          !['confirmed', 'cancelled_by_salon'].includes(status),
                      )
                      .map((status) => (
                        <button
                          className="button secondary"
                          disabled={busy}
                          key={status}
                          onClick={() =>
                            setSelected({ id: b.id, action: status })
                          }
                        >
                          {actionLabel[status] ?? t(`status.${status}`)}
                        </button>
                      ))}
                  </div>
                </details>
              )}
            </article>
          ))}
      </div>
      {!rows.length && <p className="empty-state">{t('common.empty')}</p>}
    </>
  );
}
