import Link from 'next/link';
import { entities } from '@/lib/admin-config';
import { Logout } from './admin';

export function AdminShell({
  children,
  staff,
  preview = false,
}: {
  children: React.ReactNode;
  staff: { display_name: string; role: string };
  preview?: boolean;
}) {
  const href = (section: string, path: string) =>
    preview ? `/admin/preview?section=${section}` : path;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="wordmark" href={href('overview', '/admin')}>
          GELIN HOUSE<small>L’ESPACE DU SALON</small>
        </Link>
        <nav aria-label="Administration">
          <Link href={href('overview', '/admin')}>Vue d’ensemble</Link>
          <Link href={href('calendar', '/admin/calendar')}>Calendrier</Link>
          <Link href={href('appointments', '/admin/appointments')}>
            Rendez-vous
          </Link>
          {staff.role !== 'staff' && !preview && (
            <Link href="/admin/appointments/new">Nouveau rendez-vous</Link>
          )}
          {Object.entries(entities)
            .filter(
              ([, config]) =>
                staff.role !== 'staff' &&
                (!config.owner || staff.role === 'owner'),
            )
            .map(([slug, config]) => (
              <Link href={href(slug, `/admin/${slug}`)} key={slug}>
                {config.title}
              </Link>
            ))}
          {staff.role !== 'staff' && (
            <Link href={href('activity', '/admin/activity')}>
              Historique d’activité
            </Link>
          )}
          {staff.role === 'owner' && (
            <Link href={href('team', '/admin/team')}>Accès à la gestion</Link>
          )}
        </nav>
        {preview ? (
          <Link className="button secondary" href="/">
            Quitter l’aperçu
          </Link>
        ) : (
          <Logout />
        )}
        <p className="admin-nav-home">
          <Link href="/" className="text-link">
            Voir le site ↗
          </Link>
        </p>
      </aside>
      <main className="admin-main" id="main">
        <div className="admin-topline">
          <span>
            {staff.display_name} · {preview ? 'Aperçu visuel' : staff.role}
          </span>
          <span>Heure du salon : Casablanca</span>
        </div>
        {preview && (
          <p className="notice" role="status">
            <strong>Aperçu local · Données fictives de démonstration.</strong>{' '}
            Aucun compte ni clé Supabase nécessaire. Consultation uniquement ;
            aucune réservation ni modification réelle.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
