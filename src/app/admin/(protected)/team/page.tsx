import { requirePageStaff } from '@/lib/auth';
import { privileged } from '@/lib/supabase';
import { Team } from '@/components/team';
export default async function TeamPage() {
  await requirePageStaff(true, true);
  const { data, error } = await privileged()
    .from('admin_profiles')
    .select('id,display_name,role,active')
    .order('display_name')
    .limit(100);
  return (
    <>
      <h1>Les accès à la gestion</h1>
      <p className="notice">
        La propriétaire gère les accès. Le dernier compte propriétaire actif ne
        peut pas être désactivé. Le personnel consulte ses rendez-vous attribués
        et peut marquer leurs présences ; les responsables gèrent les données
        opérationnelles.
      </p>
      {error ? (
        <p className="error">Impossible de charger les accès.</p>
      ) : (
        <Team rows={data ?? []} />
      )}
    </>
  );
}
