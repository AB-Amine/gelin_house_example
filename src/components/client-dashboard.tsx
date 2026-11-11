'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Temporal } from '@js-temporal/polyfill';
import { api, ApiError } from '@/lib/client';
import { useI18n } from './locale-provider';
export type ClientBooking = {
  timezone?: string;
  id: string;
  reference: string;
  status: string;
  starts_at: string;
  ends_at: string;
  total_minor: number;
  currency: string;
  city_name: string | null;
  event_address: string;
  travel_fee_minor: number;
  uncertain: boolean;
  items: {
    name: string;
    duration_minutes: number;
    final_minor: number | null;
  }[];
  requests: {
    id: string;
    kind: string;
    status: string;
    proposed_start: string | null;
    created_at: string;
  }[];
};
export function ClientLogout() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState(false);
  return (
    <>
      <button
        className="fatu-text-link"
        onClick={async () => {
          try {
            await api('/api/client/auth/logout', {});
            router.replace('/client/login');
            router.refresh();
          } catch {
            setError(true);
          }
        }}
      >
        {t('auth.logout')}
      </button>
      {error && <p role="alert">{t('common.error')}</p>}
    </>
  );
}
export function ClientDashboard({
  bookings,
  name,
  all = false,
  timezone = 'Africa/Casablanca',
}: {
  bookings: ClientBooking[];
  name: string;
  all?: boolean;
  timezone?: string;
}) {
  const { t, date, money } = useI18n();
  const [now] = useState(() => Date.now());
  const upcoming = bookings
    .filter(
      (b) =>
        Date.parse(b.ends_at) > now &&
        ['pending', 'confirmed', 'in_progress'].includes(b.status),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const shown = all ? bookings : upcoming.slice(0, 1);
  return (
    <>
      <div className="fatu-client-heading">
        <div>
          <span className="fatu-eyebrow">FATU / {t('nav.client')}</span>
          <h1>{t(all ? 'client.bookings' : 'client.dashboard')}</h1>
          <p>{name}</p>
        </div>
        <ClientLogout />
      </div>
      {!all && (
        <div className="fatu-client-stats">
          <article>
            <span>{t('client.bookings')}</span>
            <strong>{bookings.length}</strong>
          </article>
          <article>
            <span>{t('admin.pending')}</span>
            <strong>
              {bookings.filter((b) => b.status === 'pending').length}
            </strong>
          </article>
          <article>
            <span>{t('client.next')}</span>
            <strong>{upcoming.length}</strong>
          </article>
        </div>
      )}
      {shown.length ? (
        shown.map((b) => (
          <article className="fatu-client-booking" key={b.id}>
            <header>
              <strong>{b.reference}</strong>
              <span className="badge">
                {t(
                  b.requests?.some(
                    (r) => r.kind === 'reschedule' && r.status === 'pending',
                  )
                    ? 'status.reschedule_requested'
                    : `status.${b.status}`,
                )}
              </span>
            </header>
            <h2>{date(b.starts_at, { timeZone: b.timezone ?? timezone })}</h2>
            <p>
              {b.city_name} · {b.event_address}
            </p>
            <ul>
              {b.items.map((i, k) => (
                <li key={k}>
                  {i.name} · {i.duration_minutes} min
                </li>
              ))}
            </ul>
            <p>
              {t('booking.total')}:{' '}
              <strong>{money(b.total_minor, b.currency)}</strong>
            </p>
            {b.requests?.map((r) => (
              <p className="notice" key={r.id}>
                {t(
                  r.kind === 'cancel'
                    ? 'client.cancelRequest'
                    : 'client.rescheduleRequest',
                )}{' '}
                · {t(`request.${r.status}`)}
                {r.proposed_start &&
                  ` · ${date(r.proposed_start, { timeZone: timezone })}`}
              </p>
            ))}
            {['pending', 'confirmed'].includes(b.status) &&
              !b.requests?.some((r) => r.status === 'pending') && (
                <ClientChange booking={b} timezone={b.timezone ?? timezone} />
              )}
          </article>
        ))
      ) : (
        <div className="fatu-empty">
          <p>{t('client.noBookings')}</p>
          <Link className="fatu-button" href="/reservation">
            {t('nav.booking')} ↗
          </Link>
        </div>
      )}
      {!all && (
        <Link className="fatu-text-link" href="/client/bookings">
          {t('client.history')} ↗
        </Link>
      )}
    </>
  );
}
function ClientChange({
  booking,
  timezone,
}: {
  booking: ClientBooking;
  timezone: string;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  return (
    <>
      <div className="fatu-actions">
        <button className="fatu-text-link" onClick={() => setKind('cancel')}>
          {t('client.cancelRequest')}
        </button>
        <button
          className="fatu-text-link"
          onClick={() => setKind('reschedule')}
        >
          {t('client.rescheduleRequest')}
        </button>
      </div>
      {kind && (
        <form
          className="fatu-profile-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage('');
            const data = new FormData(e.currentTarget);
            try {
              const start =
                kind === 'reschedule'
                  ? Temporal.ZonedDateTime.from(
                      `${data.get('start')}[${timezone}]`,
                      { disambiguation: 'reject' },
                    )
                      .toInstant()
                      .toString()
                  : null;
              await api('/api/client/requests', {
                id: booking.id,
                kind,
                reason: data.get('reason'),
                start,
              });
              setMessage('client.requestSaved');
              setKind('');
              router.refresh();
            } catch (ex) {
              setMessage(
                ex instanceof ApiError ? `error.${ex.code}` : 'common.error',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {kind === 'reschedule' && (
            <label>
              {t('client.proposedDate')}
              <input name="start" type="datetime-local" required />
              <small>{timezone}</small>
            </label>
          )}
          <label>
            {t('client.requestReason')}
            <textarea name="reason" required minLength={3} maxLength={2000} />
          </label>
          <p>{t('client.changeReview')}</p>
          <button className="fatu-button" disabled={busy}>
            {t(busy ? 'common.saving' : 'booking.submit')}
          </button>
          <button type="button" onClick={() => setKind('')}>
            {t('common.cancel')}
          </button>
        </form>
      )}
      {message && (
        <p role="status">
          {t(message) === message ? t('common.error') : t(message)}
        </p>
      )}
    </>
  );
}
export function ClientProfile({
  profile,
  email,
}: {
  profile: { name: string; phone: string; locale: string };
  email: string;
}) {
  const { t, setLocale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <>
      <div className="fatu-client-heading">
        <h1>{t('client.profile')}</h1>
        <ClientLogout />
      </div>
      <form
        className="fatu-profile-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const values = Object.fromEntries(new FormData(e.currentTarget));
          try {
            await api('/api/client/profile', values);
            setLocale(values.locale as 'fr' | 'en' | 'ar');
            setMessage('common.saved');
          } catch {
            setMessage('common.error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t('auth.fullName')}
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={profile.name}
          />
        </label>
        <label>
          {t('auth.phone')}
          <input
            name="phone"
            type="tel"
            required
            maxLength={30}
            defaultValue={profile.phone}
          />
        </label>
        <label>
          {t('auth.email')}
          <input type="email" value={email} readOnly />
        </label>
        <label>
          {t('auth.language')}
          <select name="locale" defaultValue={profile.locale}>
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>
        {message && <p role="status">{t(message)}</p>}
        <button className="fatu-button" disabled={busy}>
          {t(busy ? 'common.saving' : 'common.save')}
        </button>
        <Link className="fatu-text-link" href="/client/reset">
          {t('auth.reset')}
        </Link>
      </form>
      <form
        className="fatu-profile-form"
        style={{ marginTop: 40 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(
              '/api/client/email',
              Object.fromEntries(new FormData(e.currentTarget)),
            );
            setMessage('auth.emailPending');
          } catch {
            setMessage('common.error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t('client.changeEmail')}
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
        <p>{t('client.emailNote')}</p>
        <button className="fatu-button" disabled={busy}>
          {t('client.changeEmail')}
        </button>
      </form>
    </>
  );
}
