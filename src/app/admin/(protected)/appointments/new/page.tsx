import { requirePageStaff } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { AppointmentRequest } from '@/components/appointment-request';
import { sessionDb } from '@/lib/supabase';
import { localizeSalonClosures } from '@/lib/salon-schedule-server';
export default async function Page() {
  await requirePageStaff();
  const { catalog, unavailable } = await getCatalog();
  const db = await sessionDb();
  const [hours, exceptions, closures] = await Promise.all([
    db
      .from('working_hours')
      .select('resource_id,weekday,opens,closes', { count: 'exact' })
      .is('resource_id', null)
      .limit(500),
    db
      .from('opening_exceptions')
      .select('resource_id,day,opens,closes', { count: 'exact' })
      .is('resource_id', null)
      .limit(1000),
    db
      .from('closures')
      .select('resource_id,starts_at,ends_at,reason', { count: 'exact' })
      .is('resource_id', null)
      .limit(1000),
  ]);
  const schedule =
    !hours.error &&
    !exceptions.error &&
    !closures.error &&
    (hours.count ?? 0) <= 500 &&
    (exceptions.count ?? 0) <= 1000 &&
    (closures.count ?? 0) <= 1000
      ? {
          hours: hours.data ?? [],
          exceptions: exceptions.data ?? [],
          closures: localizeSalonClosures(closures.data ?? []),
        }
      : undefined;
  return (
    <>
      <h1>Nouveau rendez-vous</h1>
      <AppointmentRequest
        catalog={catalog}
        configured={!unavailable}
        manual
        salonSchedule={schedule}
      />
    </>
  );
}
