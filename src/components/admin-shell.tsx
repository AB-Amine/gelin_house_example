'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { Logout } from './admin';
import { AdminNavigation, AdminSectionTabs } from './admin-navigation';
export function AdminShell({
  children,
  staff,
  preview = false,
}: {
  children: React.ReactNode;
  staff: { display_name: string; role: string };
  preview?: boolean;
}) {
  return (
    <div className="admin-shell fatu-admin salon-admin" lang="fr" dir="ltr">
      <aside className="admin-sidebar">
        <Link className="wordmark" href={preview ? '/admin/preview' : '/admin'}>
          GELIN HOUSE<small>ESPACE DU SALON</small>
        </Link>
        <div className="admin-workspace">
          <span className="workspace-symbol" aria-hidden>
            g.
          </span>
          <div>
            <strong>Votre salon, simplement</strong>
            <small>Gestion quotidienne</small>
          </div>
        </div>
        <Suspense>
          <AdminNavigation preview={preview} />
        </Suspense>
        <div className="admin-sidebar-footer">
          <Link className="admin-site-link" href="/">
            Voir le site <span aria-hidden>↗</span>
          </Link>
          {preview ? (
            <Link href="/admin/login">Connexion administrateur</Link>
          ) : (
            <Logout />
          )}
        </div>
      </aside>
      <main className="admin-main" id="main">
        <div className="admin-topline">
          <span className="eyebrow">GELIN HOUSE · Administration</span>
          <div className="admin-account">
            <span className="admin-avatar" aria-hidden>
              {staff.display_name.trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{staff.display_name}</strong>
              <small>
                {preview ? 'Aperçu de développement' : 'Administrateur'}
              </small>
            </div>
          </div>
        </div>
        {preview && (
          <p className="notice" role="status">
            <strong>Aperçu de développement</strong> · Les modifications restent
            dans ce navigateur. Elles ne changent pas le site public et ne
            créent aucun rendez-vous réel.
          </p>
        )}
        <Suspense>
          <AdminSectionTabs preview={preview} />
        </Suspense>
        {children}
        <footer className="admin-bottomline">
          <span>GELIN HOUSE</span>
          <span>Gestion du salon</span>
        </footer>
      </main>
    </div>
  );
}
