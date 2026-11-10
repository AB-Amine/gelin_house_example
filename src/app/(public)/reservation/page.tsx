import { getCatalog } from '@/lib/catalog';
import { Booking } from '@/components/booking';
export const metadata = {
  title: 'Votre réservation',
  robots: { index: false, follow: false },
};
export default async function Reservation() {
  const { catalog } = await getCatalog();
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">VOTRE PARENTHÈSE BEAUTÉ</span>
        <h1>
          Un moment
          <br />
          <em>à composer.</em>
        </h1>
      </header>
      <Booking catalog={catalog} />
    </div>
  );
}
