import { requirePageStaff } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { FatuBooking } from '@/components/fatu-booking';
import { L } from '@/components/locale-provider';
export default async function Page() {
  await requirePageStaff();
  const { catalog } = await getCatalog();
  return (
    <>
      <h1>
        <L text="admin.manual" />
      </h1>
      <FatuBooking catalog={catalog} manual />
    </>
  );
}
