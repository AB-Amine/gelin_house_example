import Link from 'next/link';
import { requirePageClient } from '@/lib/client-auth';
import { ClientLogout } from '@/components/client-dashboard';
import { getCatalog } from '@/lib/catalog';
import type { Promotion } from '@/lib/domain';

export default async function AdvantagesPage() {
  const { db } = await requirePageClient();
  const { data, error } = await db.rpc('client_offers');
  if (error)
    return (
      <p className="error">Impossible de charger vos avantages. Réessayez.</p>
    );
  const offers = (data ?? []) as (Promotion & { services: string[] })[];
  const { catalog } = await getCatalog();
  const date = (value: string) =>
    new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: catalog.settings?.timezone ?? 'Africa/Casablanca',
    }).format(new Date(value));
  return (
    <>
      <div className="fatu-client-heading">
        <h1>Mes avantages</h1>
        <ClientLogout />
      </div>
      <p>
        Offres réservées aux clientes inscrites. Les conditions sont vérifiées
        lors de la confirmation du rendez-vous.
      </p>
      {offers.map((offer) => (
        <article className="fatu-client-booking" key={offer.id}>
          <h2>{offer.name}</h2>
          <p>{offer.description}</p>
          <p>
            {offer.kind === 'percentage'
              ? `${offer.value} %`
              : new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: catalog.settings?.currency ?? 'MAD',
                }).format(offer.value / 100)}{' '}
            de réduction
          </p>
          <p>
            Du {date(offer.starts_at)} au {date(offer.ends_at)}
          </p>
          {offer.services?.length > 0 && <p>{offer.services.join(' · ')}</p>}
          <p>{offer.terms}</p>
          <Link className="fatu-button" href="/reservation">
            Demander un rendez-vous ↗
          </Link>
        </article>
      ))}
      {!offers.length && (
        <p className="fatu-empty">
          Aucune offre exclusive disponible pour le moment.
        </p>
      )}
    </>
  );
}
