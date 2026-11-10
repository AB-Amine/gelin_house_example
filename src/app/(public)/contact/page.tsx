import { getCatalog } from '@/lib/catalog';
export const metadata = {
  title: 'Contact',
  alternates: { canonical: '/contact' },
};
export default async function Contact() {
  const { catalog } = await getCatalog();
  const s = catalog.settings;
  const days = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
  ];
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">ON SE RETROUVE</span>
        <h1>
          À bientôt
          <br />
          <em>à la maison.</em>
        </h1>
      </header>
      <div className="contact-grid">
        <section>
          <h2>Nous contacter</h2>
          {s?.address ? (
            <address>{s.address}</address>
          ) : (
            <p>L’adresse sera publiée après confirmation par le salon.</p>
          )}
          <div className="inline-actions">
            {s?.phone && (
              <a className="button" href={`tel:${s.phone}`}>
                {s.phone}
              </a>
            )}
            {s?.whatsapp && (
              <a
                className="button secondary"
                href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Bonjour GELIN HOUSE, je souhaite des informations sur un rendez-vous.')}`}
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir WhatsApp ↗
              </a>
            )}
          </div>
          {s?.whatsapp && (
            <p className="small">
              WhatsApp ouvre une conversation. Aucun message n’est envoyé
              automatiquement.
            </p>
          )}
          {s?.map_url && (
            <p>
              <a
                className="text-link"
                href={s.map_url}
                target="_blank"
                rel="noreferrer"
              >
                Voir l’itinéraire ↗
              </a>
            </p>
          )}
          {s?.instagram && (
            <a
              className="text-link"
              href={s.instagram}
              target="_blank"
              rel="noreferrer"
            >
              Instagram ↗
            </a>
          )}
        </section>
        <section>
          <h2>Les horaires</h2>
          {s && catalog.hours.length ? (
            [1, 2, 3, 4, 5, 6, 0].map((day) => (
              <div className="hours-row" key={day}>
                <span>{days[day]}</span>
                <span>
                  {catalog.hours
                    .filter((h) => h.weekday === day)
                    .map(
                      (h) => `${h.opens.slice(0, 5)} – ${h.closes.slice(0, 5)}`,
                    )
                    .join(' / ') || 'Fermé'}
                </span>
              </div>
            ))
          ) : (
            <p>Les horaires d’ouverture seront publiés après validation.</p>
          )}
          <p className="small">
            Heure locale : Africa/Casablanca. Les fermetures exceptionnelles
            sont prises en compte dans les créneaux de réservation.
          </p>
        </section>
      </div>
    </div>
  );
}
