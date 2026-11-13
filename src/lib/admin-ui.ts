export const adminSections = [
  { key: 'overview', label: 'Tableau de bord', href: '/admin', icon: '◈' },
  { key: 'bookings', label: 'Rendez-vous', href: '/admin/messages', icon: '◷' },
  {
    key: 'clients',
    label: 'Clientes inscrites',
    href: '/admin/clients',
    icon: '♡',
  },
  { key: 'services', label: 'Prestations', href: '/admin/services', icon: '✧' },
  {
    key: 'promotions',
    label: 'Offres',
    href: '/admin/promotions',
    icon: '◇',
  },
  { key: 'settings', label: 'Mon salon', href: '/admin/settings', icon: '⌂' },
] as const;
export const bookingPages = [
  'bookings',
  'appointments',
  'calendar',
  'requests',
  'messages',
  'payments',
];
export function adminSection(page: string) {
  if (page === 'overview' || !page) return 'overview';
  if (['clients', 'customers'].includes(page)) return 'clients';
  if (bookingPages.includes(page)) return 'bookings';
  if (['services', 'categories'].includes(page)) return 'services';
  if (['promotions', 'offers', 'eligibility'].includes(page))
    return 'promotions';
  return 'settings';
}
export const weekdays = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];
export function toMinor(value: string | number) {
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw Error('Saisissez un montant positif avec deux décimales au maximum.');
  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor > 100000000)
    throw Error('Le montant est trop élevé.');
  return minor;
}
export function newSlug(name: string, suffix: string) {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'prestation';
  return `${base.slice(0, 100)}-${suffix}`;
}
export function promotionState(
  row: {
    active: unknown;
    starts_at: unknown;
    ends_at: unknown;
    max_uses?: unknown;
    usage_count?: unknown;
  },
  now = Date.now(),
) {
  if (!row.active) return 'Désactivée';
  if (Date.parse(String(row.ends_at)) <= now) return 'Expirée';
  if (row.max_uses && Number(row.usage_count) >= Number(row.max_uses))
    return 'Épuisée';
  return Date.parse(String(row.starts_at)) > now ? 'Programmée' : 'Active';
}
