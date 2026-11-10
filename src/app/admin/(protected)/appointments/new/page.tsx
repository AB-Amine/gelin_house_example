import { requirePageStaff } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { Booking } from '@/components/booking';
import { ServiceCatalog } from '@/components/catalog';
export default async function Manual() {
  await requirePageStaff(true);
  const { catalog } = await getCatalog();
  return (
    <>
      <h1>Un rendez-vous manuel</h1>
      <p>
        Les mêmes règles de disponibilité et de réservation s’appliquent.
        Sélectionnez les prestations, puis le créneau et les coordonnées.
      </p>
      <ServiceCatalog catalog={catalog} />
      <div style={{ marginTop: 45 }}>
        <Booking catalog={catalog} manual />
      </div>
    </>
  );
}
