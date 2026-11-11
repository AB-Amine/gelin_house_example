import { requirePageClient } from '@/lib/client-auth';
import { ClientProfile } from '@/components/client-dashboard';
export default async function Page() {
  const { db, user } = await requirePageClient();
  const { data, error } = await db.rpc('client_profile');
  if (error) throw Error('Unable to load profile');
  return (
    <ClientProfile
      profile={{
        ...data,
        name:
          data.name ||
          (typeof user.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : ''),
        phone:
          data.phone ||
          (typeof user.user_metadata?.phone === 'string'
            ? user.user_metadata.phone
            : ''),
      }}
      email={user.email ?? ''}
    />
  );
}
