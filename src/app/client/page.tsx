import { requirePageClient } from '@/lib/client-auth';
import { ClientDashboard } from '@/components/client-dashboard';
import { getCatalog } from '@/lib/catalog';
export default async function Page() {
  const { db, user } = await requirePageClient();
  const [{ data: bookings, error }, { data: profile }] = await Promise.all([
    db.rpc('client_bookings'),
    db.rpc('client_profile'),
  ]);
  if (error) throw Error('Unable to load bookings');
  const { catalog } = await getCatalog();
  return (
    <ClientDashboard
      bookings={bookings ?? []}
      name={profile?.name || user.user_metadata?.name || ''}
      timezone={catalog.settings?.timezone}
      policies={catalog.settings}
    />
  );
}
