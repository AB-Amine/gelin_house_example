import Link from 'next/link';
import { getI18n } from '@/lib/i18n/server';
import { z } from 'zod';
import { sessionDb } from '@/lib/supabase';
import { requirePageStaff } from '@/lib/auth';
import { calendarWindow } from '@/lib/calendar';
import { Calendar, type CalendarEntry } from '@/components/calendar';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    view?: string;
    resource?: string;
    q?: string;
  }>;
}) {
  await requirePageStaff();
  const p = await searchParams;
  const { t } = await getI18n();
  const db = await sessionDb();
  const { data: settings } = await db
    .from('salon_settings')
    .select('timezone')
    .single();
  const timezone = settings?.timezone ?? 'Africa/Casablanca';
  const period = calendarWindow(p.date, p.view, timezone);
  const resource = z.uuid().safeParse(p.resource).success ? p.resource! : '';
  const q = (p.q ?? '').slice(0, 80);
  const [
    { data: rows, error },
    { data: resources },
    { data: closures },
    { data: hours },
    { data: exceptions },
  ] = await Promise.all([
    db
      .rpc('search_appointments', {
        p_query: q,
        p_start: period.start,
        p_end: period.end,
        p_resource: resource || null,
      })
      .select(
        'reference,starts_at,ends_at,status,customers(name,phone),appointment_items(name,resource_id,resources(name))',
      )
      .limit(500),
    db.from('resources').select('id,name').eq('kind', 'staff').order('name'),
    db
      .from('closures')
      .select('resource_id,starts_at,ends_at,reason')
      .lt('starts_at', period.end)
      .gt('ends_at', period.start)
      .limit(100),
    db
      .from('working_hours')
      .select('resource_id,weekday,opens,closes')
      .limit(500),
    db
      .from('opening_exceptions')
      .select('resource_id,day,opens,closes')
      .gte('day', period.from)
      .lte('day', period.to)
      .limit(500),
  ]);
  const href = (date: string) =>
    // Keep all filters when navigating between periods.
    `/admin/calendar?${new URLSearchParams({ date, view: period.view, resource, q })}`;
  return (
    <>
      <span className="eyebrow">{t('admin.providers')}</span>
      <h1>{t('admin.calendar')}</h1>
      <form className="admin-toolbar">
        <label>
          {t('field.day')}
          <input name="date" type="date" defaultValue={period.anchor} />
        </label>
        <label>
          {t('calendar.view')}
          <select name="view" defaultValue={period.view}>
            <option value="day">{t('calendar.day')}</option>
            <option value="week">{t('calendar.week')}</option>
            <option value="month">{t('calendar.month')}</option>
            <option value="list">{t('calendar.list')}</option>
          </select>
        </label>
        <label>
          {t('admin.providers')}
          <select name="resource" defaultValue={resource}>
            <option value="">{t('common.all')}</option>
            {resources?.map((r) => (
              <option value={r.id} key={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('calendar.search')}
          <input name="q" type="search" defaultValue={q} maxLength={80} />
        </label>
        <button className="button">{t('common.filter')}</button>
        <Link className="button secondary" href="/admin/appointments/new">
          + {t('admin.manual')}
        </Link>
      </form>
      <div className="calendar-navigation">
        <Link className="button secondary" href={href(period.previous)}>
          ← {t('common.back')}
        </Link>
        <span>
          {period.from} — {period.to}
        </span>
        <Link className="button secondary" href={href(period.next)}>
          {t('common.next')} →
        </Link>
      </div>
      {error ? (
        <p className="error">{t('common.error')}</p>
      ) : (
        <Calendar
          window={period}
          rows={(Array.isArray(rows) ? rows : []) as unknown as CalendarEntry[]}
          closures={closures ?? []}
          hours={hours ?? []}
          exceptions={exceptions ?? []}
          resource={resource}
          query={q}
          timezone={timezone}
        />
      )}
      <p className="small">
        {timezone} · {t('calendar.availabilityNote')}
      </p>
      {Array.isArray(rows) && rows.length === 500 && (
        <p className="notice">{t('calendar.limit')}</p>
      )}
    </>
  );
}
