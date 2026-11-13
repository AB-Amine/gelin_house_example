import { requirePageClient } from '@/lib/client-auth';
import { ClientDashboard } from '@/components/client-dashboard';
import { getCatalog } from '@/lib/catalog';
export default async function Page() {
  const { db, user } = await requirePageClient();
  const { data: bookings, error } = await db.rpc('client_bookings');
  if (error) throw Error('Unable to load bookings');
  const { catalog } = await getCatalog();
  return (
    <ClientDashboard
      all
      bookings={bookings ?? []}
      name={user.user_metadata?.name || ''}
      timezone={catalog.settings?.timezone}
      policies={catalog.settings}
    />
  );
}
