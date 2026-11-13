import { requirePageStaff } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { AppointmentRequest } from '@/components/appointment-request';
export default async function Page() {
  await requirePageStaff();
  const { catalog, unavailable } = await getCatalog();
  return (
    <>
      <h1>Nouveau rendez-vous</h1>
      <AppointmentRequest catalog={catalog} configured={!unavailable} manual />
    </>
  );
}
