import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/auth';
import { publicConfig } from '@/lib/supabase';
import { FatuAdminAuth } from '@/components/fatu-admin-auth';
import { getI18n } from '@/lib/admin-i18n';
export default async function Login() {
  if (await getStaff()) redirect('/admin');
  const { t } = await getI18n();
  return (
    <main id="main" className="fatu-admin-login">
      <Link className="wordmark" href="/admin/login">GELIN HOUSE<small>ESPACE DU SALON</small></Link>
      <h1>{t('admin.title')}</h1>
      <p>{t('admin.equalAccess')}</p>
      <FatuAdminAuth configured={!!publicConfig()} />
      <Link className="fatu-text-link" href="/">
        {t('admin.visit')} ↗
      </Link>
    </main>
  );
}
