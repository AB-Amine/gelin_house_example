import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/auth';
import { publicConfig } from '@/lib/supabase';
import { FatuAdminAuth } from '@/components/fatu-admin-auth';
import { getI18n } from '@/lib/i18n/server';
import { FatuWordmark } from '@/components/fatu-shell';
import { LanguageSwitcher } from '@/components/locale-provider';
export default async function Login() {
  if (await getStaff()) redirect('/admin');
  const { t } = await getI18n();
  return (
    <main id="main" className="fatu-admin-login">
      <FatuWordmark />
      <LanguageSwitcher />
      <h1>{t('admin.title')}</h1>
      <p>{t('admin.equalAccess')}</p>
      <FatuAdminAuth configured={!!publicConfig()} />
      <Link className="fatu-text-link" href="/">
        {t('admin.visit')} ↗
      </Link>
    </main>
  );
}
