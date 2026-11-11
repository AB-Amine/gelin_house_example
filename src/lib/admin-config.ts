import { z } from 'zod';
import { phoneSchema } from './domain';
export type Field = {
  key: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'checkbox'
    | 'select'
    | 'datetime-local'
    | 'time'
    | 'date'
    | 'url';
  options?: { value: string; label: string }[];
  ref?: string;
  nullable?: boolean;
  min?: number;
  max?: number;
};
const text = (key: string, label: string, textarea = false): Field => ({
  key,
  label,
  type: textarea ? 'textarea' : 'text',
});
const num = (key: string, label: string, min = 0, max = 100000000): Field => ({
  key,
  label,
  type: 'number',
  min,
  max,
});
const bool = (key: string, label: string): Field => ({
  key,
  label,
  type: 'checkbox',
});
const ref = (
  key: string,
  label: string,
  table: string,
  nullable = false,
): Field => ({ key, label, type: 'select', ref: table, nullable });
const choices = (key: string, label: string, items: string[]): Field => ({
  key,
  label,
  type: 'select',
  options: items.map((value) => ({ value, label: value })),
});
export const entities: Record<
  string,
  {
    title: string;
    table: string;
    fields: Field[];
    deletable?: boolean;
  }
> = {
  services: {
    title: 'Prestations',
    table: 'services',
    fields: [
      text('name', 'Nom'),
      text('slug', 'Adresse courte (slug)'),
      ref('category_id', 'Catégorie', 'categories', true),
      text('description', 'Description', true),
      text('preparation', 'Préparation', true),
      text('image_path', 'Chemin de la photo téléversée (facultatif)'),
      num('duration_minutes', 'Durée (minutes)', 5, 720),
      num('buffer_before', 'Préparation (minutes)', 0, 240),
      num('buffer_after', 'Nettoyage (minutes)', 0, 240),
      choices('price_type', 'Type de prix', [
        'fixed',
        'starting',
        'consultation',
      ]),
      {
        ...num('price_minor', 'Prix en centimes MAD (100 = 1 MAD)'),
        nullable: true,
      },
      bool('published', 'Publier'),
      bool('bookable', 'Réservable'),
      bool('featured', 'À la une'),
      bool('archived', 'Archiver'),
      num('position', 'Ordre'),
    ],
  },
  categories: {
    title: 'Catégories',
    table: 'categories',
    fields: [
      text('name', 'Nom'),
      text('slug', 'Adresse courte (slug)'),
      text('description', 'Description', true),
      text('image_path', 'Chemin de la photo téléversée (facultatif)'),
      num('position', 'Ordre'),
      bool('published', 'Publier'),
      bool('archived', 'Archiver'),
    ],
  },
  staff: {
    title: 'Équipe et ressources',
    table: 'resources',
    fields: [
      text('name', 'Nom interne'),
      choices('kind', 'Type', ['staff', 'equipment']),
      bool('active', 'Actif'),
    ],
  },
  qualifications: {
    title: 'Qualifications',
    table: 'qualifications',
    fields: [
      ref('resource_id', 'Membre de l’équipe', 'resources'),
      ref('service_id', 'Prestation', 'services'),
    ],
    deletable: true,
  },
  resources: {
    title: 'Équipement par prestation',
    table: 'service_resources',
    fields: [
      ref('service_id', 'Prestation', 'services'),
      ref('resource_id', 'Ressource physique', 'resources'),
    ],
    deletable: true,
  },
  availability: {
    title: 'Horaires et pauses',
    table: 'working_hours',
    fields: [
      ref('resource_id', 'Ressource (vide = salon)', 'resources', true),
      {
        key: 'weekday',
        label: 'Jour',
        type: 'select',
        options: [
          'Dimanche',
          'Lundi',
          'Mardi',
          'Mercredi',
          'Jeudi',
          'Vendredi',
          'Samedi',
        ].map((label, i) => ({ value: String(i), label })),
      },
      { key: 'opens', label: 'Ouverture', type: 'time' },
      { key: 'closes', label: 'Fermeture', type: 'time' },
    ],
    deletable: true,
  },
  exceptions: {
    title: 'Horaires exceptionnels',
    table: 'opening_exceptions',
    fields: [
      ref('resource_id', 'Ressource (vide = salon)', 'resources', true),
      { key: 'day', label: 'Date (Casablanca)', type: 'date' },
      { key: 'opens', label: 'Ouverture', type: 'time' },
      { key: 'closes', label: 'Fermeture', type: 'time' },
    ],
    deletable: true,
  },
  closures: {
    title: 'Fermetures et absences',
    table: 'closures',
    fields: [
      ref('resource_id', 'Ressource (vide = salon)', 'resources', true),
      { key: 'starts_at', label: 'Début (Casablanca)', type: 'datetime-local' },
      { key: 'ends_at', label: 'Fin (Casablanca)', type: 'datetime-local' },
      text('reason', 'Motif'),
    ],
    deletable: true,
  },
  offers: {
    title: 'Offres',
    table: 'promotions',
    fields: [
      text('name', 'Titre'),
      text('description', 'Description', true),
      choices('kind', 'Réduction', ['percentage', 'fixed']),
      num('value', 'Valeur (% ou centimes)', 1),
      { key: 'starts_at', label: 'Début (Casablanca)', type: 'datetime-local' },
      { key: 'ends_at', label: 'Fin (Casablanca)', type: 'datetime-local' },
      text('terms', 'Conditions', true),
      bool('active', 'Activer'),
    ],
  },
  eligibility: {
    title: 'Prestations en promotion',
    table: 'promotion_services',
    fields: [
      ref('promotion_id', 'Offre', 'promotions'),
      ref('service_id', 'Prestation', 'services'),
    ],
    deletable: true,
  },
  gallery: {
    title: 'Galerie',
    table: 'gallery',
    fields: [
      text('path', 'Chemin de la photo téléversée'),
      text('alt', 'Description accessible'),
      text('album', 'Album'),
      num('position', 'Ordre'),
      bool('published', 'Publier'),
    ],
    deletable: true,
  },
  content: {
    title: 'Contenu du site',
    table: 'website_content',
    fields: [
      text('key', 'Identifiant de section'),
      text('title', 'Titre'),
      text('body', 'Texte', true),
      bool('published', 'Publier'),
    ],
  },
  customers: {
    title: 'Clientèle',
    table: 'customers',
    fields: [
      text('name', 'Nom'),
      text('phone', 'Téléphone'),
      text('email', 'E-mail'),
      text('notes', 'Notes internes', true),
    ],
  },
  settings: {
    title: 'Réglages du salon',
    table: 'salon_settings',
    fields: [
      text('name', 'Nom officiel'),
      text('logo_path', 'Chemin du logo téléversé (facultatif)'),
      text(
        'hero_image_path',
        'Chemin de la photo d’accueil téléversée (facultatif)',
      ),
      choices('brand_color', 'Couleur d’accent', [
        '#B89B72',
        '#30231F',
        '#8D7153',
        '#8b5147',
        '#695b4d',
        '#4f6357',
        '#574b5e',
      ]),
      bool('approved', 'Informations vérifiées par la propriétaire'),
      bool('booking_enabled', 'Ouvrir les réservations'),
      text('phone', 'Téléphone vérifié'),
      text('whatsapp', 'WhatsApp vérifié'),
      text('address', 'Adresse'),
      { key: 'map_url', label: 'Lien de la carte', type: 'url' },
      { key: 'instagram', label: 'Lien Instagram', type: 'url' },
      text('about', 'Présentation', true),
      text('hero_title', 'Titre de l’accueil'),
      text('hero_subtitle', 'Sous-titre de l’accueil', true),
      text('privacy_text', 'Confidentialité', true),
      text(
        'policy_text',
        'Politique de réservation (inclure les demandes en attente sans expiration)',
        true,
      ),
      num('notice_minutes', 'Préavis minimum (minutes)', 0, 43200),
      num('horizon_days', 'Horizon (jours)', 1, 365),
      num('increment_minutes', 'Intervalle des créneaux (minutes)', 5, 120),
      bool('cancellation_enabled', 'Autoriser l’annulation autonome'),
      bool('rescheduling_enabled', 'Autoriser le déplacement autonome'),
      num(
        'cancellation_notice_hours',
        'Préavis d’annulation (heures)',
        0,
        8760,
      ),
      num(
        'rescheduling_notice_hours',
        'Préavis de déplacement (heures)',
        0,
        8760,
      ),
      num('no_show_grace_minutes', 'Délai avant absence (minutes)', 0, 1440),
    ],
  },
};
entities.locations = {
  title: 'admin.locations',
  table: 'cities',
  fields: [
    text('name', 'field.name'),
    text('slug', 'field.slug'),
    num('travel_fee_minor', 'booking.travel'),
    bool('active', 'field.active'),
    num('position', 'field.position'),
  ],
};
entities['service-cities'] = {
  title: 'admin.serviceCities',
  table: 'service_cities',
  fields: [
    ref('service_id', 'nav.services', 'services'),
    ref('city_id', 'booking.city', 'cities'),
  ],
  deletable: true,
};
entities['city-hours'] = {
  title: 'admin.cityHours',
  table: 'city_hours',
  fields: [
    ref('city_id', 'booking.city', 'cities'),
    num('weekday', 'field.weekday', 0, 6),
    { key: 'opens', label: 'field.opens', type: 'time' },
    { key: 'closes', label: 'field.closes', type: 'time' },
  ],
  deletable: true,
};
entities.reviews = {
  title: 'admin.reviews',
  table: 'reviews',
  fields: [
    text('name', 'field.name'),
    text('body', 'field.body', true),
    { ...num('rating', 'field.rating', 1, 5), nullable: true },
    bool('consent_confirmed', 'field.consent'),
    bool('verified', 'field.verified'),
    bool('published', 'field.published'),
    num('position', 'field.position'),
  ],
};
entities.translations = {
  title: 'admin.translations',
  table: 'translations',
  fields: [
    choices('entity', 'field.entity', [
      'services',
      'categories',
      'cities',
      'website_content',
    ]),
    text('entity_id', 'field.entityId'),
    choices('locale', 'auth.language', ['fr', 'ar', 'en']),
    text('fields', 'field.translations', true),
  ],
  deletable: true,
};
entities.services.fields.splice(
  5,
  0,
  text('included_items', 'services.included', true),
);
entities.gallery.fields.push(
  text('title', 'field.title'),
  text('description', 'field.description', true),
  { key: 'video_url', label: 'field.video_url', type: 'url' },
  bool('featured', 'field.featured'),
  bool('consent_confirmed', 'field.consent'),
  bool('temporary', 'field.temporary'),
);
entities.offers.fields.push(
  { ...text('code', 'booking.code'), nullable: true },
  { ...num('max_uses', 'field.maxUses', 1), nullable: true },
);
entities.settings.fields.push(
  text('timezone', 'field.timezone'),
  text('currency', 'field.currency'),
  { ...text('email', 'auth.email'), nullable: true },
  text('deposit_policy', 'field.deposit_policy', true),
);
entities.translations.fields[0].options = [
  'services',
  'categories',
  'cities',
  'website_content',
  'gallery',
  'reviews',
  'salon_settings',
].map((value) => ({ value, label: value }));
entities.portfolio = entities.gallery;
entities.promotions = entities.offers;
entities.clients = entities.customers;
entities.faqs = { ...entities.content, title: 'nav.faq' };
for (const [slug, title] of Object.entries({
  services: 'admin.services',
  categories: 'admin.categories',
  staff: 'admin.providers',
  qualifications: 'admin.skills',
  resources: 'admin.equipment',
  availability: 'admin.availability',
  exceptions: 'admin.exceptions',
  closures: 'admin.closures',
  offers: 'admin.promotions',
  promotions: 'admin.promotions',
  eligibility: 'admin.eligibility',
  gallery: 'admin.portfolio',
  portfolio: 'admin.portfolio',
  content: 'admin.content',
  customers: 'admin.clients',
  clients: 'admin.clients',
  settings: 'admin.settings',
}))
  entities[slug].title = title;
export function entitySchema(slug: string) {
  const config = entities[slug];
  if (!config) throw Error('FORBIDDEN');
  const shape: Record<string, z.ZodType> = {
    id: z.union([z.uuid(), z.literal(1)]).optional(),
  };
  for (const field of config.fields) {
    let schema: z.ZodType;
    if (field.key === 'fields')
      schema = z
        .union([
          z.record(z.string(), z.string().max(10000)),
          z
            .string()
            .max(12000)
            .transform((value, ctx) => {
              try {
                return JSON.parse(value);
              } catch {
                ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
                return z.NEVER;
              }
            }),
        ])
        .pipe(z.record(z.string(), z.string().max(10000)))
        .refine((v) =>
          Object.keys(v).every((k) =>
            [
              'name',
              'description',
              'preparation',
              'included_items',
              'title',
              'body',
              'alt',
              'about',
              'hero_title',
              'hero_subtitle',
              'privacy_text',
              'policy_text',
              'deposit_policy',
              'address',
            ].includes(k),
          ),
        );
    else if (field.key === 'email')
      schema = z.union([z.email().max(254), z.literal('')]);
    else if (field.type === 'checkbox') schema = z.boolean();
    else if (field.type === 'number' || field.key === 'weekday')
      schema = z
        .number()
        .int()
        .min(field.min ?? 0)
        .max(field.max ?? 6);
    else if (field.ref || field.key === 'entity_id') schema = z.uuid();
    else if (field.key === 'phone' || field.key === 'whatsapp')
      schema = z.union([phoneSchema, z.literal('')]);
    else if (field.key === 'slug')
      schema = z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(150);
    else if (field.key === 'path')
      schema = z.string().regex(/^gallery\/[a-f0-9-]{36}\.webp$/);
    else if (['logo_path', 'hero_image_path', 'image_path'].includes(field.key))
      schema = z.union([
        z.string().regex(/^gallery\/[a-f0-9-]{36}\.webp$/),
        z.literal(''),
      ]);
    else if (field.type === 'datetime-local')
      schema = z.iso.datetime({ offset: true });
    else if (field.type === 'date') schema = z.iso.date();
    else if (field.type === 'time')
      schema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
    else if (field.type === 'url')
      schema = z.union([
        z.url().refine((v) => v.startsWith('https://'), 'HTTPS requis'),
        z.literal(''),
      ]);
    else if (field.options)
      schema = z.enum(
        field.options.map((o) => o.value) as [string, ...string[]],
      );
    else
      schema = z
        .string()
        .trim()
        .max(field.type === 'textarea' ? 10000 : 300)
        .refine(
          (v) =>
            !['name', 'slug', 'reason', 'alt', 'path', 'key', 'title'].includes(
              field.key,
            ) || v.length > 0,
          'Champ requis',
        );
    if (field.nullable) schema = schema.nullable();
    shape[field.key] = schema;
  }
  return z.strictObject(shape);
}
