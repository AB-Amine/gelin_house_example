import { NextRequest } from 'next/server';
import { z } from 'zod';
import { privileged } from '@/lib/supabase';
import { body, failure, ok, rateLimit, sameOrigin } from '@/lib/http';
const schema = z.object({
  services: z.array(z.uuid()).min(1).max(10),
  date: z.iso.date(),
});
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await rateLimit(req, 'request-availability', 60);
    const v = schema.parse(await body(req));
    const db = privileged();
    const [
      { data: cfg, error: cfgError },
      { data: services, error: servicesError },
      { data: cities, error: cityError },
      { data: links, error: linkError },
    ] = await Promise.all([
      db
        .from('salon_settings')
        .select('approved,booking_enabled,timezone')
        .single(),
      db
        .from('services')
        .select('id,duration_minutes,bookable')
        .in('id', v.services)
        .eq('published', true)
        .eq('archived', false)
        .eq('service_type', 'appointment'),
      db.from('cities').select('id').eq('active', true),
      db
        .from('service_cities')
        .select('city_id,service_id')
        .in('service_id', v.services),
    ]);
    if (cfgError || servicesError || cityError || linkError)
      throw Error('UNAVAILABLE');
    const eligible =
      cities?.filter((c) =>
        v.services.every((id) =>
          links?.some((l) => l.city_id === c.id && l.service_id === id),
        ),
      ) ?? [];
    if (
      !cfg?.approved ||
      !cfg.booking_enabled ||
      services?.length !== v.services.length ||
      services.some((s) => !s.bookable || !s.duration_minutes) ||
      eligible.length !== 1
    )
      return ok({ ready: false, slots: [] });
    const { data, error } = await db.rpc('fatu_slots', {
      p_services: v.services,
      p_date: v.date,
      p_city: eligible[0].id,
      p_code: '',
    });
    if (error) {
      if (
        ['NOT_CONFIGURED', 'SERVICE_UNAVAILABLE'].some((code) =>
          error.message.includes(code),
        )
      )
        return ok({ ready: false, slots: [] });
      throw error;
    }
    return ok({ ready: true, timezone: cfg.timezone, slots: data });
  } catch (error) {
    return failure(error);
  }
}
