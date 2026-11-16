import 'server-only';
import { privileged } from './supabase';

// Application data is already committed by the confirmed SQL plan. Auth is a
// separate operation; keep the durable pending job until absence is verified.
export async function finishAccountDeletion(id: string, jobId: string) {
  const pending = {
    deleted: false,
    pending: true,
    id,
    jobId,
    message:
      'Les données de l’application ont été supprimées. La suppression du compte de connexion reste à terminer. Réessayez depuis Clientes inscrites.',
  };
  try {
    const db = privileged();
    const lookup = await db.auth.admin.getUserById(id);
    if (lookup.error && lookup.error.status !== 404) return pending;
    if (lookup.data.user) {
      const removal = await db.auth.admin.deleteUser(id, false);
      if (removal.error) return pending;
    }
    const completion = await db.rpc('gelin_complete_account_deletion', {
      p_job: jobId,
    });
    if (
      completion.error ||
      completion.data?.deleted !== true ||
      completion.data.id !== id
    )
      return pending;
    return { deleted: true, id, jobId };
  } catch {
    return pending;
  }
}
