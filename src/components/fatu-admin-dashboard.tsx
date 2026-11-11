'use client';
import Link from 'next/link';
import { useI18n } from './locale-provider';
type Amount = { currency: string; total_minor: number };
export type AdminSummary = {
  total: number;
  pending: number;
  clients: number;
  completed: number;
  cancelled: number;
  booked_value: Amount[];
  paid: Amount[];
  popular: { name: string; bookings: number }[];
  upcoming: {
    id: string;
    reference: string;
    starts_at: string;
    status: string;
    city_name: string | null;
    name: string;
  }[];
  requests: number;
  messages: number;
  notifications: number;
};
export function FatuAdminDashboard({
  summary: s,
  from,
  to,
  timezone,
  preview = false,
}: {
  summary: AdminSummary;
  from: string;
  to: string;
  timezone: string;
  preview?: boolean;
}) {
  const { t, money, date } = useI18n();
  const href = (path: string) =>
    preview
      ? `/admin/preview?section=${path === '/admin' ? 'overview' : (path.split('/')[2] ?? 'overview')}`
      : path;
  return (
    <>
      <header className="fatu-admin-heading">
        <div>
          <span className="eyebrow">FATU / {t('nav.admin')}</span>
          <h1>{t('admin.overview')}</h1>
          <p>{t('admin.noRevenueClaim')}</p>
        </div>
        <Link className="button" href={href('/admin/appointments/new')}>
          + {t('admin.manual')}
        </Link>
      </header>
      <form className="admin-toolbar">
        <label>
          {t('field.from')}
          <input name="from" type="date" defaultValue={from} />
        </label>
        <label>
          {t('field.to')}
          <input name="to" type="date" defaultValue={to} />
        </label>
        <button className="button secondary">{t('common.filter')}</button>
      </form>
      <div className="stat-grid">
        {[
          ['admin.bookings', s.total],
          ['admin.pending', s.pending],
          ['admin.clients', s.clients],
          ['status.completed', s.completed],
          ['admin.cancelled', s.cancelled],
        ].map(([key, n]) => (
          <article className="stat-card" key={key}>
            <span>{t(String(key))}</span>
            <strong>{n}</strong>
          </article>
        ))}
      </div>
      <div className="fatu-admin-finance">
        {[
          ['admin.paid', s.paid],
          ['admin.bookedValue', s.booked_value],
        ].map(([key, amounts]) => (
          <article key={String(key)}>
            <span className="eyebrow">{t(String(key))}</span>
            {(amounts as Amount[]).length ? (
              (amounts as Amount[]).map((a) => (
                <strong key={a.currency}>
                  {money(a.total_minor, a.currency)}
                </strong>
              ))
            ) : (
              <strong>—</strong>
            )}
            <p>
              {t(key === 'admin.paid' ? 'admin.paidNote' : 'admin.bookedNote')}
            </p>
          </article>
        ))}
      </div>
      <div className="fatu-admin-inbox">
        {[
          ['admin.requests', s.requests, '/admin/requests'],
          ['admin.messages', s.messages, '/admin/messages'],
          ['admin.notifications', s.notifications, '/admin/notifications'],
        ].map(([key, n, path]) => (
          <Link key={key} href={href(String(path))}>
            <span>{t(String(key))}</span>
            <strong>{n} ↗</strong>
          </Link>
        ))}
      </div>
      <section className="fatu-admin-section">
        <div className="section-heading">
          <h2>{t('admin.upcoming')}</h2>
          <Link className="text-link" href={href('/admin/calendar')}>
            {t('admin.calendar')} ↗
          </Link>
        </div>
        {s.upcoming.length ? (
          <div className="fatu-admin-upcoming">
            {s.upcoming.map((b) => (
              <Link
                key={b.id}
                href={href(`/admin/bookings?reference=${b.reference}`)}
              >
                <time>{date(b.starts_at, { timeZone: timezone })}</time>
                <div>
                  <strong>{b.name}</strong>
                  <small>
                    {b.reference} · {b.city_name}
                  </small>
                </div>
                <span className="badge">{t(`status.${b.status}`)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">{t('common.empty')}</p>
        )}
      </section>
      <section className="fatu-admin-section">
        <h2>{t('admin.popular')}</h2>
        {s.popular.map((p, i) => (
          <div className="fatu-popular" key={p.name}>
            <span>0{i + 1}</span>
            <strong>{p.name}</strong>
            <span>{p.bookings}</span>
          </div>
        ))}
      </section>
      <section className="website-workspace">
        <h2>{t('admin.website')}</h2>
        <div className="website-cards">
          {[
            ['admin.services', 'services'],
            ['admin.portfolio', 'portfolio'],
            ['admin.locations', 'locations'],
            ['admin.content', 'content'],
            ['admin.translations', 'translations'],
            ['admin.settings', 'settings'],
          ].map(([key, path], i) => (
            <Link
              className="website-card"
              key={path}
              href={href(`/admin/${path}`)}
            >
              <span className="website-card-number">0{i + 1} ↗</span>
              <h3>{t(key)}</h3>
              <span>{t('common.edit')} →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
