'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/client';
import type { ManagedBooking } from '@/lib/domain';
import { useI18n } from './locale-provider';
export function FatuManage() {
  const { t, date, money } = useI18n();
  const [booking, setBooking] = useState<
    | (ManagedBooking & {
        currency?: string;
        city_name?: string;
        event_address?: string;
      })
    | null
  >(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const initialRequest = useRef<Promise<ManagedBooking> | null>(null);
  useEffect(() => {
    let active = true;
    if (!initialRequest.current) {
      const token = location.hash.slice(1);
      history.replaceState(null, '', location.pathname);
      initialRequest.current = /^[a-f0-9]{64}$/.test(token)
        ? api<ManagedBooking>('/api/manage', { action: 'exchange', token })
        : api<ManagedBooking>('/api/manage', undefined, 'GET');
    }
    initialRequest.current
      .then((b) => {
        if (active) setBooking(b);
      })
      .catch(() => {
        if (active) setError('booking.privateError');
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="fatu-container fatu-section">
      <h1 className="fatu-title">{t('client.bookings')}</h1>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {!booking && !error && <p role="status">{t('common.loading')}</p>}
      {booking && (
        <article className="fatu-client-booking">
          <header>
            <strong>{booking.reference}</strong>
            <span className="badge">{t(`status.${booking.status}`)}</span>
          </header>
          <h2>
            {date(booking.starts_at, {
              timeZone: booking.timezone ?? 'Africa/Casablanca',
            })}
          </h2>
          <p>
            {booking.city_name} · {booking.event_address}
          </p>
          {booking.items.map((i) => (
            <p key={i.service_id}>
              {i.name} · {i.duration_minutes} min
            </p>
          ))}
          <p>
            {t('booking.total')}:{' '}
            {money(booking.total_minor, booking.currency ?? 'MAD')}
          </p>
          {booking.status === 'pending' && (
            <p className="notice">{t('common.notConfirmed')}</p>
          )}
          <p>{t('client.claim')}</p>
          <div className="fatu-actions">
            <button
              className="fatu-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage('');
                try {
                  await api('/api/manage', { action: 'claim', id: booking.id });
                  setMessage('client.claimed');
                } catch (e) {
                  setMessage(
                    e instanceof ApiError && e.code === 'FORBIDDEN'
                      ? 'client.claimLogin'
                      : 'common.error',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('client.claim')}
            </button>
            <Link className="fatu-text-link" href="/client/login">
              {t('auth.login')}
            </Link>
            <Link className="fatu-text-link" href="/client/register">
              {t('auth.register')}
            </Link>
          </div>
          {message && <p role="status">{t(message)}</p>}
          <Link className="fatu-text-link" href="/client/bookings">
            {t('client.bookings')} ↗
          </Link>
        </article>
      )}
    </div>
  );
}
