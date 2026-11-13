import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { requireStaff } from '@/lib/auth';
import { privileged } from '@/lib/supabase';
import { appointmentRequestSchema } from '@/lib/appointment-requests';
import { body, failure, ok, sameOrigin } from '@/lib/http';
const schema = appointmentRequestSchema
  .omit({ consent: true, website: true })
  .extend({ key: z.uuid() });
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const staff = await requireStaff();
    const v = schema.parse(await body(req));
    const db = privileged();
    const { data: cfg, error: cfgError } = await db
      .from('salon_settings')
      .select('timezone')
      .single();
    if (cfgError) throw cfgError;
    const start = Temporal.ZonedDateTime.from(
      `${v.date}T${v.time}[${cfg.timezone}]`,
      { disambiguation: 'reject' },
    )
      .toInstant()
      .toString();
    const { data, error } = await db.rpc('create_diary_appointment', {
      p_services: v.services,
      p_start: start,
      p_name: v.name,
      p_phone: v.phone,
      p_email: v.email,
      p_notes: v.notes,
      p_actor: staff.id,
      p_key: v.key,
    });
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return failure(error);
  }
}
