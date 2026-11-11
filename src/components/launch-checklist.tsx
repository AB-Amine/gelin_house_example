import Link from 'next/link';
import { sessionDb } from '@/lib/supabase';

export async function LaunchChecklist() {
  const db = await sessionDb();
  const [
    { data: settings },
    { count: services },
    { count: skills },
    { count: hours },
  ] = await Promise.all([
    db
      .from('salon_settings')
      .select('approved,phone,privacy_text,policy_text')
      .single(),
    db
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)
      .eq('bookable', true)
      .eq('archived', false),
    db.from('qualifications').select('id', { count: 'exact', head: true }),
    db
      .from('working_hours')
      .select('id', { count: 'exact', head: true })
      .is('resource_id', null),
  ]);
  const checks = [
    {
      label: 'Identité & politiques',
      detail: 'Coordonnées, confidentialité et conditions validées.',
      done: !!(
        settings?.approved &&
        settings.phone &&
        settings.privacy_text &&
        settings.policy_text
      ),
      path: '/admin/settings',
    },
    {
      label: 'Carte des prestations',
      detail: 'Au moins une prestation publiée et réservable.',
      done: (services ?? 0) > 0,
      path: '/admin/services',
    },
    {
      label: 'Compétences de l’équipe',
      detail: 'Associer les prestataires à leurs prestations.',
      done: (skills ?? 0) > 0,
      path: '/admin/qualifications',
    },
    {
      label: 'Horaires du salon',
      detail: 'Définir les plages d’ouverture de la maison.',
      done: (hours ?? 0) > 0,
      path: '/admin/availability',
    },
  ];
  return (
    <section
      className="launch-checklist"
      aria-labelledby="launch-checklist-title"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">LES PREMIERS PAS</span>
          <h2 id="launch-checklist-title">Préparez votre ouverture.</h2>
        </div>
        <span className="badge">
          {checks.filter((c) => c.done).length} / {checks.length}
        </span>
      </div>
      <div className="launch-checks">
        {checks.map((c) => (
          <Link href={c.path} key={c.label}>
            <span
              className={
                c.done ? 'check-indicator is-complete' : 'check-indicator'
              }
              aria-label={c.done ? 'Renseigné' : 'À compléter'}
            >
              {c.done ? '✓' : '○'}
            </span>
            <div>
              <strong>{c.label}</strong>
              <small>{c.detail}</small>
            </div>
            <span aria-hidden>↗</span>
          </Link>
        ))}
      </div>
      <p className="small">
        Ces repères vous guident. Vérifiez aussi les horaires et disponibilités
        de chaque ressource, puis activez la réservation dans les réglages.
      </p>
    </section>
  );
}
