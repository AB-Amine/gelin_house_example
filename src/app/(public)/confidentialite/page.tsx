import { getCatalog } from '@/lib/catalog';
export const metadata = {
  title: 'Confidentialité et réservation',
  alternates: { canonical: '/confidentialite' },
};
export default async function Privacy() {
  const { catalog } = await getCatalog();
  return (
    <div className="container legal-copy">
      <span className="eyebrow">LES INFORMATIONS UTILES</span>
      <h1>
        En toute
        <br />
        <em>confiance.</em>
      </h1>
      <h2>Votre réservation</h2>
      <p>
        {catalog.settings?.policy_text ||
          'La politique de réservation est en cours de validation. Les réservations en ligne restent fermées.'}
      </p>
      <h2>Vos données personnelles</h2>
      <p>
        {catalog.settings?.privacy_text ||
          'Les informations légales et de confidentialité seront publiées avant l’ouverture des réservations.'}
      </p>
    </div>
  );
}
