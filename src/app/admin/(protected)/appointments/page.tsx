import Link from 'next/link';
import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';
import type { ComponentProps } from 'react';
import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { getI18n } from '@/lib/admin-i18n';
import { dateRange } from '@/lib/dates';
import { statuses } from '@/lib/domain';
import { FatuAppointments } from '@/components/fatu-appointments';
import { FatuAdminInbox } from '@/components/fatu-admin-inbox';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
    status?: string;
    city?: string;
    service?: string;
    q?: string;
    customer?: string;
    client?: string;
    reference?: string;
    page?: string;
  }>;
}) {
  await requirePageStaff();
  const { t } = await getI18n();
  const p = await searchParams;
  const db = await sessionDb();
  const { data: settings } = await db
    .from('salon_settings')
    .select('timezone')
    .single();
  const timezone = settings?.timezone ?? 'Africa/Casablanca';
  const range = dateRange(p.from, p.to, 30, timezone);
  const uuid = (value?: string) =>
    z.uuid().safeParse(value).success ? value! : null;
  const page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  const history = !!(uuid(p.customer) || uuid(p.client) || p.reference);
  const period = [
    'today',
    'week',
    'upcoming',
    'pending',
    'all',
    'history',
  ].includes(p.period ?? '')
    ? p.period!
    : 'upcoming';
  const today = Temporal.Now.plainDateISO(timezone);
  const midnight = (d: Temporal.PlainDate) =>
    d
      .toZonedDateTime({ timeZone: timezone, plainTime: '00:00' })
      .toInstant()
      .toString();
  const week = today.subtract({ days: today.dayOfWeek - 1 });
  const bounds =
    period === 'today'
      ? [midnight(today), midnight(today.add({ days: 1 }))]
      : period === 'week'
        ? [midnight(week), midnight(week.add({ days: 7 }))]
        : period === 'upcoming'
          ? [Temporal.Now.instant().toString(), null]
          : [null, null];
  const status =
    period === 'history'
      ? 'history'
      : period === 'pending'
        ? 'pending'
        : [...statuses, 'reschedule_requested'].includes(p.status ?? '')
          ? p.status!
          : '';
  const [{ data, error }, { data: cities }, { data: services }] =
    await Promise.all([
      db.rpc('fatu_search_bookings', {
        p_query: (p.q ?? '').slice(0, 100),
        p_status: status,
        p_city: uuid(p.city),
        p_service: uuid(p.service),
        p_from: history ? null : p.from || p.to ? range.start : bounds[0],
        p_to: history ? null : p.from || p.to ? range.end : bounds[1],
        p_customer: uuid(p.customer),
        p_client: uuid(p.client),
        p_reference: (p.reference ?? '').slice(0, 40),
        p_page: page,
      }),
      db.from('cities').select('id,name').order('name'),
      db.from('services').select('id,name').order('name'),
    ]);
  const { data: refused, count: refusedCount } =
    period === 'history'
      ? await db
          .from('contact_messages')
          .select('*', { count: 'exact' })
          .eq('request_status', 'rejected')
          .order('created_at', { ascending: false })
          .range((page - 1) * 50, page * 50 - 1)
      : { data: [], count: 0 };
  return (
    <>
      <h1>
        {period === 'history' ? 'Historique des rendez-vous' : 'Rendez-vous'}
      </h1>
      {period !== 'history' && (
        <div className="salon-context">
          {[
            ['today', 'Aujourd’hui'],
            ['week', 'Cette semaine'],
            ['upcoming', 'À venir'],
            ['pending', 'En attente'],
            ['all', 'Tous'],
          ].map(([key, label]) => (
            <Link
              key={key}
              aria-current={period === key ? 'page' : undefined}
              href={`/admin/bookings?period=${key}`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
      <form className="admin-toolbar">
        <input type="hidden" name="period" value={period} />
        <label>
          {t('calendar.search')}
          <input name="q" type="search" maxLength={100} defaultValue={p.q} />
        </label>
        <details className="salon-filter-details">
          <summary>Plus de filtres</summary>
          <div className="form-grid">
            <label>
              {t('field.from')}
              <input name="from" type="date" defaultValue={p.from ?? ''} />
            </label>
            <label>
              {t('field.to')}
              <input name="to" type="date" defaultValue={p.to ?? ''} />
            </label>
            <label>
              {t('field.status')}
              <select name="status" defaultValue={status}>
                <option value="">{t('common.all')}</option>
                {[...statuses, 'reschedule_requested'].map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('booking.city')}
              <select name="city" defaultValue={p.city ?? ''}>
                <option value="">{t('common.all')}</option>
                {cities?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('nav.services')}
              <select name="service" defaultValue={p.service ?? ''}>
                <option value="">{t('common.all')}</option>
                {services?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        {['customer', 'client', 'reference'].map(
          (key) =>
            p[key as keyof typeof p] && (
              <input
                key={key}
                type="hidden"
                name={key}
                value={p[key as keyof typeof p]}
              />
            ),
        )}
        <button className="button">{t('common.filter')}</button>
        <Link className="button secondary" href="/admin/appointments/new">
          + Nouveau rendez-vous
        </Link>
      </form>
      {error ? (
        <p className="error">{t('common.error')}</p>
      ) : (
        <FatuAppointments
          timezone={timezone}
          rows={
            (data?.rows ?? []).map((row: Record<string, unknown>) => ({
              ...row,
              local_start: Temporal.Instant.from(String(row.starts_at))
                .toZonedDateTimeISO(timezone)
                .toPlainDateTime()
                .toString()
                .slice(0, 16),
            })) as ComponentProps<typeof FatuAppointments>['rows']
          }
        />
      )}
      {period === 'history' && !!refused?.length && (
        <section className="fatu-admin-section">
          <h2>Demandes refusées</h2>
          <FatuAdminInbox section="messages" rows={refused} heading={false} />
        </section>
      )}
      <div className="inline-actions" style={{ marginTop: 25 }}>
        {page > 1 && (
          <Link
            href={`?${new URLSearchParams({ ...p, page: String(page - 1) })}`}
          >
            ← {t('common.back')}
          </Link>
        )}
        <span>
          {page} · {data?.count ?? 0}
        </span>
        {page * 50 < Math.max(data?.count ?? 0, refusedCount ?? 0) && (
          <Link
            href={`?${new URLSearchParams({ ...p, page: String(page + 1) })}`}
          >
            {t('common.next')} →
          </Link>
        )}
      </div>
    </>
  );
}
