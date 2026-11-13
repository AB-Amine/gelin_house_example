import { requirePageStaff } from '@/lib/auth';
import { privileged } from '@/lib/supabase';
import { Team } from '@/components/team';
import { getI18n } from '@/lib/admin-i18n';
export default async function TeamPage() {
  await requirePageStaff();
  const { t } = await getI18n();
  const { data, error } = await privileged()
    .from('admin_profiles')
    .select('id,display_name,role,active')
    .order('display_name')
    .limit(100);
  return (
    <>
      <h1>{t('admin.access')}</h1>
      <p className="notice">{t('admin.equalAccess')}</p>
      {error ? (
        <p className="error">{t('common.error')}</p>
      ) : (
        <Team rows={data ?? []} />
      )}
    </>
  );
}
