import { getCatalog } from '@/lib/catalog';
import { FatuHeading } from '@/components/fatu-pages';
import { AppointmentRequest } from '@/components/appointment-request';
export const metadata = {
  title: 'Booking · GELIN HOUSE',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ prestation?: string }>;
}) {
  const { catalog, unavailable } = await getCatalog();
  const { prestation } = await searchParams;
  return (
    <div className="fatu-container appointment-page">
      <FatuHeading title="booking.title" />
      <AppointmentRequest
        catalog={catalog}
        configured={!unavailable && !!process.env.SUPABASE_SECRET_KEY}
        initialService={prestation}
      />
    </div>
  );
}
