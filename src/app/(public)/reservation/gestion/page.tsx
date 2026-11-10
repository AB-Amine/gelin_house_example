import { getCatalog } from '@/lib/catalog';
import { ManageBooking } from '@/components/manage-booking';
export const metadata = {
  title: 'Gérer mon rendez-vous',
  robots: { index: false, follow: false },
};
export default async function Manage() {
  const { catalog } = await getCatalog();
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">VOTRE ESPACE PRIVÉ</span>
        <h1>
          Votre
          <br />
          <em>rendez-vous.</em>
        </h1>
      </header>
      <ManageBooking settings={catalog.settings} />
    </div>
  );
}
