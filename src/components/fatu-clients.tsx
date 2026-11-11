'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { useI18n } from './locale-provider';
import { CustomerPrivacy } from './customer-privacy';
export type ClientRecord = {
  id: string;
  kind: 'account' | 'guest';
  name: string;
  phone: string;
  email: string;
  notes: string;
  bookings: number;
  completed: number;
  next_at: string | null;
};
export function FatuClients({
  rows,
  query,
  page,
  count,
  timezone,
}: {
  rows: ClientRecord[];
  query: string;
  page: number;
  count: number;
  timezone: string;
}) {
  const { t, date } = useI18n();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1>{t('admin.clients')}</h1>
      <form className="admin-toolbar">
        <label>
          {t('calendar.search')}
          <input name="q" type="search" maxLength={100} defaultValue={query} />
        </label>
        <button className="button">{t('common.search')}</button>
      </form>
      {message && <p role="status">{t(message)}</p>}
      <div className="admin-record-grid">
        {rows.map((c) => (
          <article className="admin-record-card" key={`${c.kind}-${c.id}`}>
            <span className="badge">
              {t(c.kind === 'account' ? 'client.account' : 'client.guest')}
            </span>
            <h2>{c.name || t('nav.client')}</h2>
            <p>{c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}</p>
            <p>{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}</p>
            <div className="fatu-client-stats">
              <article>
                <span>{t('admin.bookings')}</span>
                <strong>{c.bookings}</strong>
              </article>
              <article>
                <span>{t('status.completed')}</span>
                <strong>{c.completed}</strong>
              </article>
            </div>
            {c.next_at && (
              <p>
                {t('client.next')}: {date(c.next_at, { timeZone: timezone })}
              </p>
            )}
            <Link
              className="fatu-text-link"
              href={`/admin/bookings?${c.kind === 'account' ? 'client' : 'customer'}=${c.id}`}
            >
              {t('client.history')} ↗
            </Link>
            <details className="entity-details">
              <summary>{t('client.profile')}</summary>
              <form
                className="fatu-profile-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await api('/api/admin/client-note', {
                      id: c.id,
                      kind: c.kind,
                      note: new FormData(e.currentTarget).get('note'),
                    });
                    setMessage('common.saved');
                    router.refresh();
                  } catch {
                    setMessage('common.error');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  {t('field.notes')}
                  <textarea
                    name="note"
                    defaultValue={c.notes}
                    maxLength={5000}
                  />
                </label>
                <button className="button secondary" disabled={busy}>
                  {t('common.save')}
                </button>
              </form>
              {c.kind === 'guest' && <CustomerPrivacy id={c.id} />}
            </details>
          </article>
        ))}
      </div>
      {!rows.length && <p className="empty-state">{t('common.empty')}</p>}
      <div className="inline-actions">
        {page > 1 && (
          <Link href={`?q=${encodeURIComponent(query)}&page=${page - 1}`}>
            ← {t('common.back')}
          </Link>
        )}
        <span>
          {page} · {count}
        </span>
        {page * 50 < count && (
          <Link href={`?q=${encodeURIComponent(query)}&page=${page + 1}`}>
            {t('common.next')} →
          </Link>
        )}
      </div>
    </>
  );
}
