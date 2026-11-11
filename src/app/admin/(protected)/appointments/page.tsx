import Link from 'next/link';
import { z } from 'zod';
import type { ComponentProps } from 'react';
import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { getI18n } from '@/lib/i18n/server';
import { dateRange } from '@/lib/dates';
import { statuses } from '@/lib/domain';
import { FatuAppointments } from '@/components/fatu-appointments';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
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
  const status = [...statuses, 'reschedule_requested'].includes(p.status ?? '')
    ? p.status!
    : '';
  const [{ data, error }, { data: cities }, { data: services }] =
    await Promise.all([
      db.rpc('fatu_search_bookings', {
        p_query: (p.q ?? '').slice(0, 100),
        p_status: status,
        p_city: uuid(p.city),
        p_service: uuid(p.service),
        p_from: history ? null : range.start,
        p_to: history ? null : range.end,
        p_customer: uuid(p.customer),
        p_client: uuid(p.client),
        p_reference: (p.reference ?? '').slice(0, 40),
        p_page: page,
      }),
      db.from('cities').select('id,name').order('name'),
      db.from('services').select('id,name').order('name'),
    ]);
  return (
    <>
      <h1>{t('admin.bookings')}</h1>
      <form className="admin-toolbar">
        <label>
          {t('calendar.search')}
          <input name="q" type="search" maxLength={100} defaultValue={p.q} />
        </label>
        <label>
          {t('field.from')}
          <input name="from" type="date" defaultValue={range.from} />
        </label>
        <label>
          {t('field.to')}
          <input name="to" type="date" defaultValue={range.to} />
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
          + {t('admin.manual')}
        </Link>
      </form>
      {error ? (
        <p className="error">{t('common.error')}</p>
      ) : (
        <FatuAppointments
          timezone={timezone}
          rows={
            (data?.rows ?? []) as ComponentProps<
              typeof FatuAppointments
            >['rows']
          }
        />
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
        {page * 50 < (data?.count ?? 0) && (
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
