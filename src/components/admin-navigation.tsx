'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from './locale-provider';
const groups = [
  {
    label: 'admin.groupBusiness',
    items: [
      ['overview', 'admin.overview', '/admin', '◈'],
      ['bookings', 'admin.bookings', '/admin/bookings', '◷'],
      ['calendar', 'admin.calendar', '/admin/calendar', '▦'],
      ['clients', 'admin.clients', '/admin/clients', '♡'],
    ],
  },
  {
    label: 'admin.groupWebsite',
    items: [
      ['services', 'admin.services', '/admin/services', '✧'],
      ['categories', 'admin.categories', '/admin/categories', '◈'],
      ['portfolio', 'admin.portfolio', '/admin/portfolio', '▧'],
      ['reviews', 'admin.reviews', '/admin/reviews', '☆'],
      ['promotions', 'admin.promotions', '/admin/promotions', '◇'],
      ['eligibility', 'admin.eligibility', '/admin/eligibility', '↳'],
      ['content', 'admin.content', '/admin/content', '≡'],
      ['translations', 'admin.translations', '/admin/translations', '文'],
      ['faqs', 'nav.faq', '/admin/faqs', '?'],
    ],
  },
  {
    label: 'admin.groupStudio',
    items: [
      ['locations', 'admin.locations', '/admin/locations', '◎'],
      ['city-hours', 'admin.cityHours', '/admin/city-hours', '◴'],
      ['availability', 'admin.availability', '/admin/availability', '◴'],
      ['exceptions', 'admin.exceptions', '/admin/exceptions', '◷'],
      ['resources', 'admin.equipment', '/admin/resources', '◇'],
      ['closures', 'admin.closures', '/admin/closures', '⊖'],
      ['staff', 'admin.providers', '/admin/staff', '♧'],
      ['qualifications', 'admin.skills', '/admin/qualifications', '✓'],
      ['service-cities', 'admin.serviceCities', '/admin/service-cities', '↳'],
    ],
  },
  {
    label: 'nav.admin',
    items: [
      ['requests', 'admin.requests', '/admin/requests', '↔'],
      ['payments', 'admin.payments', '/admin/payments', '◉'],
      ['messages', 'admin.messages', '/admin/messages', '✉'],
      ['notifications', 'admin.notifications', '/admin/notifications', '↗'],
      ['settings', 'admin.settings', '/admin/settings', '⚙'],
      ['team', 'admin.access', '/admin/team', '⌘'],
      ['activity', 'admin.activity', '/admin/activity', '↺'],
    ],
  },
];
export function AdminNavigation({ preview = false }: { preview?: boolean }) {
  const path = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const aliases: Record<string, string> = {
    bookings: 'appointments',
    clients: 'customers',
    portfolio: 'gallery',
    promotions: 'offers',
  };
  return (
    <>
      <button
        className="admin-menu-toggle button secondary"
        aria-expanded={open}
        aria-controls="admin-navigation"
        onClick={() => setOpen(!open)}
      >
        {t(open ? 'nav.close' : 'nav.menu')} <span aria-hidden>☰</span>
      </button>
      <nav
        id="admin-navigation"
        className={open ? 'is-open' : ''}
        aria-label={t('nav.admin')}
      >
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <span className="admin-nav-label">{t(group.label)}</span>
            {group.items.map(([section, label, href, icon]) => {
              const local = aliases[section] ?? section;
              const active = preview
                ? (params.get('section') ?? 'overview') === local
                : href === '/admin'
                  ? path === href
                  : path === href || path.startsWith(`${href}/`);
              return (
                <Link
                  href={preview ? `/admin/preview?section=${local}` : href}
                  key={section}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="nav-icon" aria-hidden>
                    {icon}
                  </span>
                  {t(label)}
                  {active && <span className="nav-dot" aria-hidden />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}
