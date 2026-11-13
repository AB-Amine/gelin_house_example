'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import { toMinor } from '@/lib/admin-ui';
import { useI18n } from './locale-provider';
import { AppointmentRequestActions } from './appointment-request-actions';
import type { AppointmentRequestRow } from '@/lib/appointment-requests';
type Row = Record<string, unknown>;
export function FatuAdminInbox({
  section,
  rows,
  appointments = [],
  heading = true,
}: {
  section: 'requests' | 'messages' | 'notifications' | 'payments';
  rows: Row[];
  appointments?: Row[];
  heading?: boolean;
}) {
  const { t, date, money } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function request(path: string, data: unknown) {
    setBusy(true);
    setMessage('');
    try {
      await api(path, data);
      setMessage('common.saved');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof ApiError ? `error.${e.code}` : 'common.error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {heading && (
        <h1>{section === 'messages' ? 'Demandes' : t(`admin.${section}`)}</h1>
      )}
      {section === 'messages' && heading && (
        <div className="salon-context">
          <p>
            Confirmez une demande pour l’ajouter au calendrier, modifiez son
            horaire ou refusez-la. La confirmation vérifie les disponibilités du
            salon.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => router.refresh()}
          >
            Actualiser les demandes
          </button>
        </div>
      )}
      {section === 'notifications' && (
        <p className="notice">{t('admin.deliveryNote')}</p>
      )}
      {section === 'payments' && (
        <>
          <p>{t('admin.paidNote')}</p>
          <form
            className="admin-form form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              const appointment = appointments.find(
                (a) => a.id === data.appointment,
              );
              request('/api/admin/payments', {
                ...data,
                amount: toMinor(String(data.amount)),
                currency: appointment?.currency,
              });
            }}
          >
            <label>
              {t('admin.bookings')}
              <select name="appointment" required>
                <option value="">{t('common.choose')}</option>
                {appointments.map((a) => (
                  <option key={String(a.id)} value={String(a.id)}>
                    {String(a.reference)} · {String(a.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Montant (devise du rendez-vous)
              <input
                type="number"
                name="amount"
                min="0.01"
                max="1000000"
                step="0.01"
                required
              />
            </label>
            <label>
              {t('field.kind')}
              <select name="kind">
                <option value="payment">{t('option.payment')}</option>
                <option value="refund">{t('option.refund')}</option>
              </select>
            </label>
            <label>
              {t('field.method')}
              <input name="method" minLength={2} maxLength={80} required />
            </label>
            <button disabled={busy} className="button">
              {t(busy ? 'common.saving' : 'common.save')}
            </button>
          </form>
        </>
      )}
      {message && (
        <p role="status">
          {t(message) === message ? t('common.error') : t(message)}
        </p>
      )}
      <div className="admin-record-grid">
        {rows.map((r) => (
          <article className="admin-record-card" key={String(r.id)}>
            {section === 'requests' ? (
              <>
                <h2>
                  {String(
                    (r.appointments as Row)?.reference ?? r.appointment_id,
                  )}
                </h2>
                <p>
                  {t(
                    r.kind === 'cancel'
                      ? 'client.cancelRequest'
                      : 'client.rescheduleRequest',
                  )}{' '}
                  · {t(`request.${r.status}`)}
                </p>
                <p>{String(r.reason)}</p>
                {!!r.proposed_start && <p>{date(String(r.proposed_start))}</p>}
                {r.status === 'pending' && (
                  <div className="inline-actions">
                    <button
                      disabled={busy}
                      className="button"
                      onClick={() =>
                        request('/api/admin/requests', {
                          id: r.id,
                          accept: true,
                        })
                      }
                    >
                      {t('admin.accept')}
                    </button>
                    <button
                      disabled={busy}
                      className="button secondary"
                      onClick={() =>
                        request('/api/admin/requests', {
                          id: r.id,
                          accept: false,
                        })
                      }
                    >
                      {t('admin.reject')}
                    </button>
                  </div>
                )}
              </>
            ) : section === 'messages' ? (
              <>
                <h2>{String(r.subject)}</h2>
                <p>
                  {String(r.name)}
                  {r.email ? (
                    <>
                      {' '}
                      · <a href={`mailto:${r.email}`}>{String(r.email)}</a>
                    </>
                  ) : null}
                </p>
                <p>{String(r.phone)}</p>
                <p className="prose" style={{ whiteSpace: 'pre-wrap' }}>
                  {String(r.message)
                    .split('\n')
                    .filter(
                      (line) =>
                        !line.startsWith('Date souhaitée :') &&
                        !line.startsWith('Heure souhaitée :'),
                    )
                    .join('\n')}
                </p>
                {r.subject === 'Demande de rendez-vous' ? (
                  <AppointmentRequestActions
                    request={r as AppointmentRequestRow}
                  />
                ) : (
                  <button
                    disabled={busy}
                    className="button secondary"
                    onClick={() =>
                      request('/api/admin/message-status', {
                        id: r.id,
                        handled: !r.handled,
                      })
                    }
                  >
                    {t(r.handled ? 'admin.reopen' : 'admin.markHandled')}
                  </button>
                )}
              </>
            ) : section === 'payments' ? (
              <>
                <h2>{money(Number(r.amount_minor), String(r.currency))}</h2>
                <p>
                  {t(`option.${r.kind}`)} · {String(r.method)}
                </p>
                <p>
                  {String(
                    (r.appointments as Row)?.reference ?? r.appointment_id,
                  )}
                </p>
              </>
            ) : (
              <>
                <h2>
                  {t(`event.${r.event}`) === `event.${r.event}`
                    ? String(r.event).startsWith('status_')
                      ? t(`status.${String(r.event).slice(7)}`)
                      : String(r.event)
                    : t(`event.${r.event}`)}
                </h2>
                <p>{t(`delivery.${r.status}`)}</p>
                <p>
                  {String(
                    (r.appointments as Row)?.reference ??
                      r.appointment_id ??
                      '',
                  )}
                </p>
              </>
            )}
            <small>{date(String(r.created_at ?? r.received_at))}</small>
          </article>
        ))}
      </div>
      {!rows.length && <p className="empty-state">{t('common.empty')}</p>}
    </>
  );
}
