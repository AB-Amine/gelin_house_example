import { Temporal } from '@js-temporal/polyfill';
import { sessionDb } from '@/lib/supabase';
import { requirePageStaff } from '@/lib/auth';
import { FatuAdminDashboard } from '@/components/fatu-admin-dashboard';
import { getI18n } from '@/lib/i18n/server';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePageStaff();
  const db = await sessionDb();
  const { t } = await getI18n();
  const { data: settings } = await db
    .from('salon_settings')
    .select('timezone')
    .single();
  const timezone = settings?.timezone ?? 'Africa/Casablanca';
  const p = await searchParams;
  const today = Temporal.Now.plainDateISO(timezone);
  let from = today.with({ day: 1 }),
    to = from.add({ months: 1 }).subtract({ days: 1 });
  try {
    if (p.from) from = Temporal.PlainDate.from(p.from);
    if (p.to) to = Temporal.PlainDate.from(p.to);
    if (Temporal.PlainDate.compare(to, from) < 0) to = from;
  } catch {}
  const start = from
    .toZonedDateTime({ timeZone: timezone, plainTime: '00:00' })
    .toInstant()
    .toString();
  const end = to
    .add({ days: 1 })
    .toZonedDateTime({ timeZone: timezone, plainTime: '00:00' })
    .toInstant()
    .toString();
  const { data, error } = await db.rpc('fatu_admin_summary', {
    p_start: start,
    p_end: end,
  });
  return error ? (
    <p className="error">{t('common.error')}</p>
  ) : (
    <FatuAdminDashboard
      summary={data}
      from={from.toString()}
      to={to.toString()}
      timezone={timezone}
    />
  );
}
