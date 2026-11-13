import { Temporal } from '@js-temporal/polyfill';
import { adminPreviewData } from '@/features/admin/preview-data';
import type { Catalog, ManagedBooking } from './domain';

export type DemoRow = Record<string, unknown>;
export type DemoReservation = ManagedBooking & {
  token: string;
  key: string;
  customer: { name: string; phone: string; email: string };
  notes: string;
};
export type DemoState = {
  version: 1;
  entities: Record<string, DemoRow[]>;
  bookings: DemoReservation[];
  activity: string[];
};
export function createDemoState(): DemoState {
  const day = Temporal.Now.plainDateISO('Africa/Casablanca').toString();
  const seed = adminPreviewData(day);
  const names = [
    'Brushing signature',
    'Rituel éclat du visage',
    'Manucure douce',
  ];
  const descriptions = [
    'Une mise en forme souple et lumineuse, pensée pour votre style.',
    'Une pause de douceur pour retrouver une peau fraîche et lumineuse.',
    'Une attention délicate, des mains soignées jusque dans les détails.',
  ];
  seed.entities.services = seed.services.map((s, i) => ({
    ...s,
    name: names[i],
    slug: ['brushing-signature', 'rituel-eclat', 'manucure-douce'][i],
    description: descriptions[i],
    featured: true,
    image_path: ['/coiffure.svg', '/rituel.svg', '/mains.svg'][i],
  }));
  seed.entities.categories[0] = {
    ...seed.entities.categories[0],
    name: 'Les essentiels',
    slug: 'les-essentiels',
    description: 'Trois façons de prendre du temps pour soi.',
  };
  seed.entities.settings[0] = {
    ...seed.entities.settings[0],
    booking_enabled: true,
    hero_title: 'La beauté, à votre rythme.',
    hero_subtitle:
      'Des gestes précis, une atmosphère douce et toute l’attention que vous méritez. Composez votre prochaine parenthèse beauté.',
    about:
      'Une maison imaginée autour d’une idée simple : vous offrir le temps de prendre soin de vous. Découvrez cet univers à travers notre démonstration locale.',
    address: '',
    privacy_text:
      'Démonstration locale : utilisez uniquement des coordonnées fictives. Les données restent dans ce navigateur et peuvent être réinitialisées.',
    policy_text:
      'Simulation locale. Aucune réservation réelle ni notification n’est envoyée au salon.',
    cancellation_enabled: true,
    rescheduling_enabled: true,
    notice_minutes: 0,
    cancellation_notice_hours: 0,
    rescheduling_notice_hours: 0,
  };
  seed.entities.gallery = ['/coiffure.svg', '/rituel.svg', '/mains.svg'].map(
    (path, i) => ({
      path,
      alt: `Illustration d’ambiance ${i + 1}`,
      album: 'Univers illustré',
      position: i,
      published: true,
    }),
  );
  seed.entities.availability = seed.hours.map((h) => ({ ...h }));
  seed.entities.qualifications = seed.services.map((s) => ({
    resource_id: seed.entities.staff[0].id,
    service_id: s.id,
  }));
  seed.entities.offers[0] = {
    ...seed.entities.offers[0],
    name: 'Les instants doux · 10 %',
    description: 'Une attention de démonstration sur le brushing signature.',
    starts_at: `${day}T00:00:00Z`,
    ends_at: `${Temporal.PlainDate.from(day).add({ days: 7 })}T23:00:00Z`,
  };
  seed.entities.eligibility = [
    {
      promotion_id: seed.entities.offers[0].id,
      service_id: seed.entities.services[0].id,
    },
  ];
  seed.entities.content = [
    {
      key: 'la-maison',
      title: 'L’art de prendre soin de soi',
      body: 'Une parenthèse à composer selon vos envies. Ce contenu de démonstration est modifiable depuis votre atelier.',
      published: true,
    },
  ];
  let counter = 1;
  for (const rows of Object.values(seed.entities))
    for (const row of rows) {
      if (
        row.id !== 1 &&
        (typeof row.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(row.id))
      )
        row.id = `90000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
    }
  const bookings: DemoReservation[] = seed.rows.map((r, i) => {
    const s = seed.entities.services[
      i
    ] as unknown as Catalog['services'][number];
    if (s.duration_minutes === null) throw Error('A seeded appointment requires a known duration.');
    return {
      id: `80000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      reference: r.reference,
      status: r.status,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      total_minor: s.price_minor ?? 0,
      uncertain: false,
      token: String(i + 1).repeat(64),
      key: `70000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      customer: { name: `Cliente démo ${i + 1}`, phone: '', email: '' },
      notes: '',
      history: [{ action: r.status, created_at: r.starts_at }],
      items: [
        {
          service_id: s.id,
          name: s.name,
          duration_minutes: s.duration_minutes,
          buffer_before: 0,
          buffer_after: 0,
          price_type: s.price_type,
          original_minor: s.price_minor,
          discount_minor: 0,
          final_minor: s.price_minor,
          promotion_name: null,
          starts_at: r.starts_at,
          ends_at: r.ends_at,
        },
      ],
    };
  });
  seed.entities.admin_profiles = [
    {
      id: 'a0000000-0000-4000-8000-000000000001',
      name: 'Administrateur local',
      email: 'demo@example.test',
      active: true,
    },
  ];
  return { version: 1, entities: seed.entities, bookings, activity: [] };
}
export function demoCatalog(state = createDemoState()): Catalog {
  const e = state.entities;
  return {
    demo: true,
    settings: (e.settings?.[0] ?? null) as Catalog['settings'],
    services: (e.services ?? []).filter(
      (s) =>
        s.published &&
        !s.archived &&
        (!s.category_id ||
          (e.categories ?? []).some(
            (c) => c.id === s.category_id && c.published && !c.archived,
          )),
    ) as Catalog['services'],
    categories: (e.categories ?? []).filter(
      (c) => c.published && !c.archived,
    ) as Catalog['categories'],
    promotions: (e.offers ?? []).filter(
      (p) => p.active,
    ) as Catalog['promotions'],
    promotion_services: (e.eligibility ?? []) as Catalog['promotion_services'],
    gallery: (e.gallery ?? []).filter((g) => g.published) as Catalog['gallery'],
    content: (e.content ?? []).filter((c) => c.published) as Catalog['content'],
    hours: (e.availability ?? []).filter(
      (h) => !h.resource_id,
    ) as Catalog['hours'],
  };
}
