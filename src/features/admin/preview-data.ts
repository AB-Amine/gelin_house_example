// Visual fixtures only. Never seeded or used by an operational booking endpoint.
import { localInstant } from '@/lib/domain';
import type { CalendarEntry } from '@/components/calendar';

export function adminPreviewData(day: string) {
  const resource = '11111111-1111-4111-8111-111111111111';
  const category = '22222222-2222-4222-8222-222222222222';
  const services = [
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Prestation exemple A',
      slug: 'exemple-a',
      duration_minutes: 60,
      price_minor: 12500,
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Prestation exemple B',
      slug: 'exemple-b',
      duration_minutes: 90,
      price_minor: 17500,
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Prestation exemple C',
      slug: 'exemple-c',
      duration_minutes: 45,
      price_minor: 9000,
    },
  ].map((s, position) => ({
    ...s,
    category_id: category,
    description:
      'Description fictive pour visualiser la présentation. À remplacer par la carte réelle du salon.',
    preparation: '',
    image_path: '',
    buffer_before: 0,
    buffer_after: 0,
    price_type: 'fixed',
    published: true,
    bookable: true,
    featured: position === 0,
    archived: false,
    position,
  }));
  const rows: CalendarEntry[] = [
    {
      reference: 'DEMO-001',
      starts_at: localInstant(day, '11:00'),
      ends_at: localInstant(day, '12:00'),
      status: 'pending',
      customers: { name: 'Cliente exemple A', phone: '' },
      appointment_items: [
        {
          name: services[0].name,
          resource_id: resource,
          resources: { name: 'Prestataire exemple' },
        },
      ],
    },
    {
      reference: 'DEMO-002',
      starts_at: localInstant(day, '14:00'),
      ends_at: localInstant(day, '15:30'),
      status: 'confirmed',
      customers: { name: 'Cliente exemple B', phone: '' },
      appointment_items: [
        {
          name: services[1].name,
          resource_id: resource,
          resources: { name: 'Prestataire exemple' },
        },
      ],
    },
    {
      reference: 'DEMO-003',
      starts_at: localInstant(day, '16:00'),
      ends_at: localInstant(day, '16:45'),
      status: 'completed',
      customers: { name: 'Cliente exemple C', phone: '' },
      appointment_items: [
        {
          name: services[2].name,
          resource_id: resource,
          resources: { name: 'Prestataire exemple' },
        },
      ],
    },
  ];
  const entities: Record<string, Record<string, unknown>[]> = {
    services,
    categories: [
      {
        id: category,
        name: 'Catégorie exemple',
        slug: 'categorie-exemple',
        description: 'Catégorie fictive de démonstration.',
        image_path: '',
        position: 0,
        published: true,
        archived: false,
      },
    ],
    staff: [
      {
        id: resource,
        name: 'Prestataire exemple',
        kind: 'staff',
        active: true,
        admin_user_id: null,
      },
    ],
    offers: [
      {
        id: '66666666-6666-4666-8666-666666666666',
        name: 'Offre exemple — 10 %',
        description: 'Offre fictive pour examiner la présentation.',
        kind: 'percentage',
        value: 10,
        starts_at: localInstant(day, '10:00'),
        ends_at: localInstant(day, '21:00'),
        terms:
          'Démonstration uniquement, offre non disponible à la réservation.',
        active: true,
      },
    ],
    customers: rows.map((r, i) => ({
      id: `client-exemple-${i}`,
      name: r.customers!.name,
      phone: 'Non renseigné — démonstration',
      email: '',
      notes: 'Fiche fictive, aucune donnée personnelle réelle.',
    })),
    content: [
      {
        id: 'content-demo',
        key: 'presentation-exemple',
        title: 'La maison — exemple',
        body: 'Exemple de présentation éditable dans le véritable espace de gestion.',
        published: false,
      },
    ],
    settings: [
      {
        id: 1,
        name: 'GELIN HOUSE',
        approved: false,
        booking_enabled: false,
        phone: '',
        whatsapp: '',
        address: 'Adresse à confirmer',
        map_url: '',
        instagram: '',
        about: 'Présentation fictive pour l’aperçu.',
        hero_title: 'Un moment pour vous.',
        hero_subtitle: 'Texte d’exemple',
        logo_path: '',
        hero_image_path: '',
        brand_color: '#8b5147',
        privacy_text: 'À compléter avant ouverture.',
        policy_text: 'À confirmer par la propriétaire.',
        notice_minutes: 120,
        horizon_days: 60,
        increment_minutes: 15,
        cancellation_enabled: false,
        rescheduling_enabled: false,
        cancellation_notice_hours: 24,
        rescheduling_notice_hours: 24,
        no_show_grace_minutes: 30,
      },
    ],
  };
  return {
    rows,
    services,
    entities,
    refs: {
      categories: entities.categories,
      services,
      resources: entities.staff,
      promotions: entities.offers,
      admin_profiles: [],
    },
    hours: Array.from({ length: 7 }, (_, weekday) => ({
      resource_id: null,
      weekday,
      opens: '10:00',
      closes: '21:00',
    })),
  };
}
