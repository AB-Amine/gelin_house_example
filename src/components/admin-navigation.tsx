'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { adminSection, adminSections } from '@/lib/admin-ui';
export function AdminNavigation({ preview = false }: { preview?: boolean }) {
  const path = usePathname();
  const params = useSearchParams();
  const [menuFor, setMenuFor] = useState('');
  const locationKey = `${path}?${params.toString()}`;
  const open = menuFor === locationKey;
  const current = adminSection(
    preview
      ? (params.get('section') ?? 'overview')
      : (path.split('/')[2] ?? 'overview'),
  );
  return (
    <>
      <button
        className="admin-menu-toggle button secondary"
        aria-expanded={open}
        aria-controls="admin-navigation"
        onClick={() => setMenuFor(open ? '' : locationKey)}
      >
        {open ? 'Fermer' : 'Menu'} <span aria-hidden>☰</span>
      </button>
      <nav
        id="admin-navigation"
        className={open ? 'is-open' : ''}
        aria-label="Navigation principale"
      >
        <div className="admin-nav-group">
          {adminSections.map((s) => (
            <Link
              key={s.key}
              href={preview ? `/admin/preview?section=${s.key}` : s.href}
              aria-current={current === s.key ? 'page' : undefined}
              onClick={() => setMenuFor('')}
            >
              <span className="nav-icon" aria-hidden>
                {s.icon}
              </span>
              {s.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
export function AdminSectionTabs({ preview = false }: { preview?: boolean }) {
  const path = usePathname();
  const params = useSearchParams();
  const page = preview
    ? (params.get('section') ?? 'overview')
    : (path.split('/')[2] ?? 'overview');
  const section = adminSection(page);
  const link = (slug: string, query = '') =>
    preview
      ? `/admin/preview?section=${slug}${query ? `&${query}` : ''}`
      : `/admin/${slug}${query ? `?${query}` : ''}`;
  const tabs =
    section === 'bookings'
      ? [
          ['messages', 'Demandes'],
          ['calendar', 'Calendrier'],
          ['bookings?period=history', 'Historique'],
        ]
      : section === 'services'
        ? [
            ['services', 'Prestations'],
            ['categories', 'Catégories'],
          ]
        : section === 'settings'
          ? [
              ['settings', 'Informations'],
              ['availability', 'Horaires'],
              ['portfolio', 'Photos'],
              ['settings?view=website', 'Site web'],
              ['account', 'Mon compte'],
            ]
          : [];
  const renderLink = ([slug, label]: string[]) => {
    const [route, query] = slug.split('?');
    const currentPage = ['exceptions', 'closures'].includes(page)
      ? 'availability'
      : ['faqs', 'reviews', 'content'].includes(page)
        ? 'settings'
        : page === 'team'
          ? 'account'
          : page;
    const currentView = ['faqs', 'reviews', 'content'].includes(page)
      ? 'website'
      : (params.get('view') ?? '');
    const active =
      route === currentPage &&
      (route !== 'settings' ||
        currentView === (new URLSearchParams(query).get('view') ?? ''));
    return (
      <Link
        key={slug}
        className={active ? 'is-active' : ''}
        aria-current={active ? 'page' : undefined}
        href={link(route, query)}
        prefetch={route === 'messages' ? false : undefined}
      >
        {label}
      </Link>
    );
  };
  return (
    <>
      {tabs.length > 0 && (
        <nav className="salon-tabs" aria-label="Rubriques de la section">
          {tabs.map(renderLink)}
        </nav>
      )}
    </>
  );
}
