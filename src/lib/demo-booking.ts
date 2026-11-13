'use client';
import { Temporal } from '@js-temporal/polyfill';
import { getDemoState, updateDemoState } from './demo-store';
import { demoCatalog, type DemoReservation } from './demo-data';
import {
  bookingSchema,
  selectionSchema,
  localInstant,
  currentPrice,
  type Quote,
  type ManagedBooking,
} from './domain';

function occupied(start: string, end: string, ignore?: string) {
  return getDemoState().bookings.some(
    (b) =>
      b.id !== ignore &&
      ['pending', 'confirmed', 'in_progress'].includes(b.status) &&
      Date.parse(start) < Date.parse(b.ends_at) &&
      Date.parse(end) > Date.parse(b.starts_at),
  );
}
async function quote(
  ids: string[],
  start: string,
  previous?: ManagedBooking,
): Promise<Quote> {
  selectionSchema.parse({ services: ids });
  const catalog = demoCatalog(getDemoState());
  if (!catalog.settings?.booking_enabled)
    throw Error(
      'La réservation de démonstration est fermée dans les réglages.',
    );
  let cursor = Date.parse(start);
  if (!Number.isFinite(cursor) || cursor <= Date.now())
    throw Error('Choisissez une date et un horaire à venir.');
  const items = ids.map((id) => {
    const s = catalog.services.find((s) => s.id === id && s.bookable);
    if (!s) throw Error('Une prestation n’est plus disponible.');
    const old = previous?.items.find((i) => i.service_id === id);
    const price = currentPrice(s, catalog);
    const duration = old?.duration_minutes ?? s.duration_minutes;
    if (duration === null) throw Error('La durée de cette prestation reste à confirmer.');
    const before = old?.buffer_before ?? s.buffer_before;
    const after = old?.buffer_after ?? s.buffer_after;
    const item = {
      service_id: id,
      name: old?.name ?? s.name,
      duration_minutes: duration,
      buffer_before: before,
      buffer_after: after,
      price_type: old?.price_type ?? s.price_type,
      original_minor: old?.original_minor ?? s.price_minor,
      discount_minor:
        old?.discount_minor ??
        (s.price_minor === null ? 0 : s.price_minor - (price.amount ?? 0)),
      final_minor: old ? old.final_minor : price.amount,
      promotion_name: old?.promotion_name ?? price.promotion?.name ?? null,
      starts_at: new Date(cursor).toISOString(),
      ends_at: new Date(
        cursor + (duration + before + after) * 60000,
      ).toISOString(),
    };
    cursor = Date.parse(item.ends_at);
    return item;
  });
  const end = new Date(cursor).toISOString();
  const local =
    Temporal.Instant.from(start).toZonedDateTimeISO('Africa/Casablanca');
  const finish =
    Temporal.Instant.from(end).toZonedDateTimeISO('Africa/Casablanca');
  const ranges = catalog.hours.filter((h) => h.weekday === local.dayOfWeek % 7);
  if (
    local.toPlainDate().toString() !== finish.toPlainDate().toString() ||
    !ranges.some(
      (h) =>
        local.toPlainTime().toString() >= h.opens &&
        finish.toPlainTime().toString() <= h.closes,
    )
  )
    throw Error('Ce créneau ne respecte pas les horaires du salon.');
  if (occupied(start, end, previous?.id))
    throw Error('Ce créneau est occupé dans votre démonstration.');
  const base = {
    items,
    total_minor: items.reduce((n, i) => n + (i.final_minor ?? 0), 0),
    uncertain: items.some((i) => i.price_type !== 'fixed'),
    starts_at: start,
    ends_at: end,
  };
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(base)),
  );
  return {
    ...base,
    fingerprint: Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join(''),
  };
}
async function slots(ids: string[], date: string, previous?: ManagedBooking) {
  const result: { starts_at: string; ends_at: string }[] = [];
  for (let minute = 10 * 60; minute < 19 * 60; minute += 30) {
    try {
      const start = localInstant(
        date,
        `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
      );
      const q = await quote(ids, start, previous);
      result.push({ starts_at: start, ends_at: q.ends_at });
    } catch {
      /* Unavailable slots are omitted in the local simulation. */
    }
  }
  return result;
}
type Input = Record<string, unknown>;
export async function demoRequest<T>(
  path: string,
  input: unknown = {},
  method?: string,
): Promise<T> {
  void method;
  if (process.env.NODE_ENV !== 'development')
    throw Error('Simulation locale indisponible.');
  const v = input as Input;
  if (path === '/api/availability')
    return (await slots(v.services as string[], String(v.date))) as T;
  if (path === '/api/quote')
    return (await quote(v.services as string[], String(v.start))) as T;
  if (path === '/api/bookings') {
    const request = bookingSchema.parse(input);
    const old = getDemoState().bookings.find((b) => b.key === request.key);
    if (old) {
      if (old.token !== request.token)
        throw Error('Demande de démonstration invalide.');
      return {
        reference: old.reference,
        id: old.id,
        status: old.status,
        booking: old,
      } as T;
    }
    const q = await quote(request.services, request.start);
    if (q.fingerprint !== request.fingerprint)
      throw Error('Le tarif a changé. Sélectionnez à nouveau votre créneau.');
    const booking: DemoReservation = {
      ...q,
      id: crypto.randomUUID(),
      reference: `DEMO-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      status: 'pending',
      token: request.token,
      key: request.key,
      customer: {
        name: request.contact.name,
        phone: request.contact.phone,
        email: request.contact.email,
      },
      notes: request.contact.notes,
      history: [{ action: 'pending', created_at: new Date().toISOString() }],
    };
    updateDemoState((s) => ({
      ...s,
      bookings: [...s.bookings, booking],
      activity: [`Simulation ${booking.reference} créée`, ...s.activity],
    }));
    return {
      reference: booking.reference,
      id: booking.id,
      status: booking.status,
      booking,
    } as T;
  }
  if (path === '/api/manage') {
    const token =
      v.action === 'exchange'
        ? String(v.token)
        : sessionStorage.getItem('gh-demo-booking-token');
    const b = getDemoState().bookings.find((b) => b.token === token);
    if (!b)
      throw Error(
        'Ouvrez le lien privé d’une réservation simulée dans ce navigateur.',
      );
    if (v.action === 'exchange') {
      sessionStorage.setItem('gh-demo-booking-token', b.token);
      return b as T;
    }
    if (!v.action) return b as T;
    if (v.id !== b.id)
      throw Error('Rouvrez le lien privé du rendez-vous affiché.');
    if (!['pending', 'confirmed'].includes(b.status))
      throw Error('Ce rendez-vous ne peut plus être modifié.');
    if (v.action === 'slots')
      return (await slots(
        b.items.map((i) => i.service_id),
        String(v.date),
        b,
      )) as T;
    const settings = demoCatalog(getDemoState()).settings!;
    if (
      (v.action === 'cancelled_by_customer' &&
        !settings.cancellation_enabled) ||
      (v.action === 'reschedule' && !settings.rescheduling_enabled)
    )
      throw Error(
        'Cette modification est désactivée dans les réglages locaux.',
      );
    const changed =
      v.action === 'reschedule'
        ? {
            ...b,
            ...(await quote(
              b.items.map((i) => i.service_id),
              String(v.start),
              b,
            )),
            total_minor: b.total_minor,
            status: 'pending' as const,
          }
        : v.action === 'cancelled_by_customer'
          ? { ...b, status: 'cancelled_by_customer' as const }
          : null;
    if (!changed) throw Error('Action inconnue.');
    changed.history = [
      ...b.history,
      { action: String(v.action), created_at: new Date().toISOString() },
    ];
    updateDemoState((s) => ({
      ...s,
      bookings: s.bookings.map((row) => (row.id === b.id ? changed : row)),
      activity: [`${b.reference} : ${v.action}`, ...s.activity],
    }));
    return { success: true } as T;
  }
  throw Error('Cette opération n’existe pas en démonstration locale.');
}
