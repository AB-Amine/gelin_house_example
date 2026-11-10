import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { EntityManager } from '@/components/admin';
import { Calendar } from '@/components/calendar';
import { Placeholder } from '@/components/site-shell';
import { entities } from '@/lib/admin-config';
import { calendarWindow } from '@/lib/calendar';
import { dateLabel, money, statusLabels } from '@/lib/domain';
import { adminPreviewData } from '@/features/admin/preview-data';

export const metadata = {
  title: 'Aperçu local de l’administration | GELIN HOUSE',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function AdminPreview({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
    date?: string;
    view?: string;
    reference?: string;
  }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const p = await searchParams;
  const section = p.section ?? 'overview';
  const period = calendarWindow(p.date, p.view);
  const demo = adminPreviewData(period.anchor);
  const path = (section: string) => `/admin/preview?section=${section}`;
  let content: React.ReactNode;
  if (section === 'overview')
    content = (
      <>
        <span className="eyebrow">LE QUOTIDIEN DU SALON · EXEMPLE</span>
        <h1>
          Bonjour,
          <br />
          place à votre journée.
        </h1>
        <div className="inline-actions">
          <Link className="button secondary" href={path('calendar')}>
            Voir le calendrier
          </Link>
          <Link className="button secondary" href={path('appointments')}>
            Demandes en attente
          </Link>
          <Link className="button secondary" href={path('services')}>
            Les prestations
          </Link>
          <Link className="button secondary" href={path('offers')}>
            Les offres
          </Link>
        </div>
        <div className="stats">
          {[
            [demo.rows.length, 'Rendez-vous — exemple'],
            [
              demo.rows.filter((r) => r.status === 'pending').length,
              'Demande en attente — exemple',
            ],
            [
              money(demo.services.reduce((sum, s) => sum + s.price_minor, 0)),
              'Valeur prévue — exemple',
            ],
            [
              money(demo.services[2].price_minor),
              'Prestations terminées — exemple',
            ],
          ].map(([value, label]) => (
            <div className="stat" key={String(label)}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <section>
          <h2>Les prochaines arrivées</h2>
          <div className="record-list">
            {demo.rows.map((r) => (
              <Link
                className="record"
                href={`${path('appointments')}&reference=${r.reference}`}
                key={r.reference}
              >
                <span className="badge">{statusLabels[r.status]}</span>
                <h3 style={{ marginTop: 12 }}>
                  {r.customers?.name} · {dateLabel(r.starts_at)}
                </h3>
                <p>{r.appointment_items.map((i) => i.name).join(' · ')}</p>
              </Link>
            ))}
          </div>
        </section>
        <section style={{ marginTop: 35 }}>
          <h2>Prestations les plus demandées</h2>
          {demo.services.map((s) => (
            <div className="hours-row" key={s.id}>
              <span>{s.name}</span>
              <span>1 · exemple</span>
            </div>
          ))}
        </section>
      </>
    );
  else if (section === 'calendar')
    content = (
      <>
        <h1>Le calendrier</h1>
        <form className="admin-toolbar">
          <input type="hidden" name="section" value="calendar" />
          <label>
            Date
            <input type="date" name="date" defaultValue={period.anchor} />
          </label>
          <label>
            Vue
            <select name="view" defaultValue={period.view}>
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="list">Liste</option>
            </select>
          </label>
          <button className="button">Afficher l’aperçu</button>
        </form>
        <Calendar
          window={period}
          rows={demo.rows}
          closures={[]}
          hours={demo.hours}
          exceptions={[]}
          resource=""
          query=""
          preview
        />
      </>
    );
  else if (section === 'appointments')
    content = (
      <>
        <h1>Les rendez-vous</h1>
        <p className="small">
          Exemples en lecture seule. Les actions réelles nécessitent une
          connexion.
        </p>
        <div className="record-list">
          {demo.rows
            .filter((r) => !p.reference || r.reference === p.reference)
            .map((r, i) => (
              <article className="record" key={r.reference}>
                <span className="badge">{statusLabels[r.status]}</span>
                <h2 style={{ marginTop: 12 }}>
                  {r.customers?.name} · {r.reference}
                </h2>
                <p>
                  {dateLabel(r.starts_at)} → {dateLabel(r.ends_at)}
                </p>
                <p>
                  {r.appointment_items
                    .map((item) => `${item.name} · ${item.resources?.name}`)
                    .join(' · ')}
                </p>
                <p>
                  Tarif fictif :{' '}
                  {money(
                    demo.services.find(
                      (s) => s.name === r.appointment_items[0].name,
                    )?.price_minor ?? demo.services[i].price_minor,
                  )}
                </p>
                <details className="appointment-details">
                  <summary>Détails du rendez-vous</summary>
                  <p>
                    Coordonnées, historique, tarifs figés et notes internes
                    apparaissent ici dans le véritable tableau de bord.
                  </p>
                </details>
              </article>
            ))}
        </div>
        {p.reference && (
          <p>
            <Link className="text-link" href={path('appointments')}>
              Voir tous les exemples
            </Link>
          </p>
        )}
      </>
    );
  else if (section === 'gallery')
    content = (
      <>
        <h1>Galerie</h1>
        <p>
          Les photographies autorisées seront gérées ici. Aucun téléversement
          n’est effectué dans cet aperçu.
        </p>
        <Placeholder label="Emplacement d’une photographie — aperçu uniquement" />
      </>
    );
  else if (section === 'team')
    content = (
      <>
        <h1>Les accès à la gestion</h1>
        <div className="record">
          <h2>Compte propriétaire — exemple</h2>
          <p>
            Gestion des invitations, des rôles et des accès. Aucun compte réel
            n’a été créé pour cet aperçu.
          </p>
        </div>
      </>
    );
  else if (section === 'activity')
    content = (
      <>
        <h1>L’activité du salon</h1>
        <div className="record">
          <span className="badge">Exemple</span>
          <p>Modification d’une prestation — cet événement est fictif.</p>
        </div>
      </>
    );
  else if (entities[section])
    content = (
      <>
        <h1>{entities[section].title}</h1>
        <EntityManager
          key={section}
          slug={section}
          rows={demo.entities[section] ?? []}
          refs={demo.refs}
          canEdit={false}
        />
      </>
    );
  else notFound();
  return (
    <AdminShell
      staff={{ display_name: 'Compte de démonstration', role: 'owner' }}
      preview
    >
      {content}
    </AdminShell>
  );
}
