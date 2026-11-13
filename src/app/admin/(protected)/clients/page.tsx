import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { getI18n } from '@/lib/admin-i18n';
import { FatuClients } from '@/components/fatu-clients';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePageStaff();
  const { t } = await getI18n();
  const p = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  const query = (p.q ?? '').slice(0, 100);
  const db = await sessionDb();
  const [{ data, error }, { data: settings }] = await Promise.all([
    db.rpc('fatu_clients', { p_query: query, p_page: page }),
    db.from('salon_settings').select('timezone').single(),
  ]);
  return error ? (
    <p className="error">{t('common.error')}</p>
  ) : (
    <FatuClients
      rows={data.rows}
      count={data.count}
      query={query}
      page={page}
      timezone={settings?.timezone ?? 'Africa/Casablanca'}
    />
  );
}
