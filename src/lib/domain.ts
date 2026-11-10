import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { Temporal } from '@js-temporal/polyfill';

export const TIMEZONE = 'Africa/Casablanca';
export const statuses = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled_by_customer',
  'cancelled_by_salon',
  'rejected',
  'no_show',
] as const;
export type Status = (typeof statuses)[number];
export const statusLabels: Record<Status, string> = {
  pending: 'En attente de confirmation',
  confirmed: 'Confirmé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled_by_customer: 'Annulé par la cliente',
  cancelled_by_salon: 'Annulé par le salon',
  rejected: 'Refusé',
  no_show: 'Absence',
};
export const transitions: Record<Status, Status[]> = {
  pending: [
    'confirmed',
    'rejected',
    'cancelled_by_customer',
    'cancelled_by_salon',
  ],
  confirmed: [
    'in_progress',
    'cancelled_by_customer',
    'cancelled_by_salon',
    'no_show',
  ],
  in_progress: ['completed', 'cancelled_by_salon'],
  completed: [],
  cancelled_by_customer: [],
  cancelled_by_salon: [],
  rejected: [],
  no_show: [],
};
export const phoneSchema = z
  .string()
  .max(30)
  .transform((v, ctx) => {
    const phone = parsePhoneNumberFromString(v, 'MA');
    if (!phone?.isValid()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Saisissez un numéro de téléphone valide.',
      });
      return z.NEVER;
    }
    return phone.number;
  });
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez votre nom.').max(120),
  phone: phoneSchema,
  email: z.union([z.email(), z.literal('')]).default(''),
  notes: z.string().max(2000).default(''),
  consent: z.literal(true, {
    error:
      'Veuillez accepter la politique de réservation et de confidentialité.',
  }),
});
export const selectionSchema = z.object({
  services: z
    .array(z.uuid())
    .min(1)
    .max(10)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Service ajouté plusieurs fois.',
    ),
});
export const slotSchema = selectionSchema.extend({
  start: z.iso.datetime({ offset: true }),
});
export const bookingSchema = slotSchema.extend({
  contact: contactSchema,
  key: z.uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
export const availabilitySchema = selectionSchema.extend({
  date: z.iso.date(),
});
export type Service = {
  image_path?: string;
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  preparation: string;
  duration_minutes: number;
  buffer_before: number;
  buffer_after: number;
  price_type: 'fixed' | 'starting' | 'consultation';
  price_minor: number | null;
  published: boolean;
  archived: boolean;
  bookable: boolean;
  featured: boolean;
  position: number;
};
export type Category = {
  image_path?: string;
  id: string;
  name: string;
  slug: string;
  description: string;
};
export type Promotion = {
  id: string;
  name: string;
  description: string;
  kind: 'percentage' | 'fixed';
  value: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  terms: string;
};
export type Settings = {
  logo_path: string;
  hero_image_path: string;
  brand_color: string;
  name: string;
  booking_enabled: boolean;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  map_url: string | null;
  instagram: string | null;
  about: string;
  hero_title: string;
  hero_subtitle: string;
  privacy_text: string;
  policy_text: string;
  notice_minutes: number;
  horizon_days: number;
  increment_minutes: number;
  cancellation_enabled: boolean;
  rescheduling_enabled: boolean;
  cancellation_notice_hours: number;
  rescheduling_notice_hours: number;
};
export type Catalog = {
  settings: Settings | null;
  services: Service[];
  categories: Category[];
  promotions: Promotion[];
  promotion_services: { promotion_id: string; service_id: string }[];
  gallery: { id: string; path: string; alt: string; album: string }[];
  content: { key: string; title: string; body: string }[];
  hours: { weekday: number; opens: string; closes: string }[];
};
export const emptyCatalog: Catalog = {
  settings: null,
  services: [],
  categories: [],
  promotions: [],
  promotion_services: [],
  gallery: [],
  content: [],
  hours: [],
};
export type QuoteItem = {
  service_id: string;
  name: string;
  duration_minutes: number;
  buffer_before: number;
  buffer_after: number;
  price_type: string;
  original_minor: number | null;
  discount_minor: number;
  final_minor: number | null;
  promotion_name: string | null;
  starts_at: string;
  ends_at: string;
};
export type Quote = {
  items: QuoteItem[];
  total_minor: number;
  uncertain: boolean;
  starts_at: string;
  ends_at: string;
  fingerprint: string;
};
export type ManagedBooking = {
  id: string;
  reference: string;
  status: Status;
  starts_at: string;
  ends_at: string;
  total_minor: number;
  uncertain: boolean;
  items: QuoteItem[];
  history: { action: string; created_at: string }[];
};
export function money(minor: number) {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(minor / 100);
}
export function priceLabel(
  service: Pick<Service, 'price_type' | 'price_minor'>,
) {
  return service.price_type === 'consultation'
    ? 'Sur consultation'
    : `${service.price_type === 'starting' ? 'À partir de ' : ''}${money(service.price_minor ?? 0)}`;
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-MA', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: TIMEZONE,
  }).format(new Date(value));
}
export function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-MA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
    timeZoneName: 'shortOffset',
  }).format(new Date(value));
}
export function localInstant(date: string, time: string) {
  return Temporal.ZonedDateTime.from(`${date}T${time}[${TIMEZONE}]`, {
    disambiguation: 'reject',
  })
    .toInstant()
    .toString();
}
export function discountMinor(
  amount: number,
  kind: 'fixed' | 'percentage',
  value: number,
) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isInteger(value) ||
    value < 0 ||
    (kind === 'percentage' && value > 100)
  )
    throw Error('Invalid amount');
  return Math.min(
    amount,
    kind === 'fixed' ? value : Math.floor((amount * value + 50) / 100),
  );
}
export function currentPrice(
  service: Service,
  catalog: Catalog,
  now = Date.now(),
) {
  if (service.price_type !== 'fixed' || service.price_minor === null)
    return { amount: service.price_minor, promotion: null };
  const candidates = catalog.promotions.filter(
    (p) =>
      p.active &&
      Date.parse(p.starts_at) <= now &&
      Date.parse(p.ends_at) > now &&
      catalog.promotion_services.some(
        (x) => x.service_id === service.id && x.promotion_id === p.id,
      ),
  );
  const best = candidates.sort(
    (a, b) =>
      discountMinor(
        service.price_minor!,
        'percentage' === b.kind ? 'percentage' : 'fixed',
        b.value,
      ) - discountMinor(service.price_minor!, a.kind, a.value) ||
      a.id.localeCompare(b.id),
  )[0];
  return {
    amount:
      service.price_minor -
      (best ? discountMinor(service.price_minor, best.kind, best.value) : 0),
    promotion: best ?? null,
  };
}
