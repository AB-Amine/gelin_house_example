import Link from 'next/link';
import { requirePageStaff } from '@/lib/auth';
import { privileged } from '@/lib/supabase';
import { FatuAdminAuth } from '@/components/fatu-admin-auth';
import { Team } from '@/components/team';

export default async function AccountPage() {
  const staff = await requirePageStaff();
  const { data, error } = await privileged()
    .from('admin_profiles')
    .select('id,display_name,role,active')
    .order('display_name')
    .limit(100);
  return (
    <>
      <h1>Mon compte</h1>
      <p>
        {staff.display_name} · {staff.email}
      </p>
      <section className="fatu-admin-section">
        <h2>Changer mon mot de passe</h2>
        <FatuAdminAuth configured mode="password" />
      </section>
      <details className="entity-details">
        <summary>Accès administrateurs</summary>
        <p>
          Chaque administrateur actif dispose du même accès complet au salon.
        </p>
        {error ? (
          <p className="error">Impossible de charger les accès.</p>
        ) : (
          <Team rows={data ?? []} />
        )}
      </details>
      <details className="entity-details salon-support">
        <summary>Assistance et réglages techniques</summary>
        <p>
          Ces outils protégés sont réservés à la configuration et au dépannage.
        </p>
        <Link href="/admin/settings?view=advanced">
          Ouvrir les réglages techniques
        </Link>
      </details>
    </>
  );
}
