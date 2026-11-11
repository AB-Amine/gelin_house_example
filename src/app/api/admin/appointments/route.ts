import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { privileged, sessionDb } from '@/lib/supabase';
import { body, failure, ok, sameOrigin, tokenHash } from '@/lib/http';
import { bookingSchema, statuses } from '@/lib/domain';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const staff = await requireStaff();
    const input = await body(req);
    const note = z
      .object({
        action: z.literal('note'),
        id: z.uuid(),
        note: z.string().max(5000),
      })
      .safeParse(input);
    if (note.success) {
      await requireStaff();
      const { error } = await (
        await sessionDb()
      ).rpc('admin_note', { p_id: note.data.id, p_note: note.data.note });
      if (error) throw error;
      return ok({ success: true });
    }
    const manual = z
      .object({
        action: z.literal('create'),
        booking: bookingSchema,
        source: z.enum(['phone', 'whatsapp', 'instagram', 'walk_in', 'other']),
      })
      .safeParse(input);
    if (manual.success) {
      await requireStaff();
      const v = manual.data.booking;
      const { data, error } = await privileged().rpc('create_booking', {
        p_services: v.services,
        p_start: v.start,
        p_name: v.contact.name,
        p_phone: v.contact.phone,
        p_email: v.contact.email,
        p_notes: v.contact.notes,
        p_key: v.key,
        p_token_hash: tokenHash(v.token),
        p_fingerprint: v.fingerprint,
        p_source: manual.data.source,
        p_actor: staff.id,
      });
      if (error) throw error;
      return ok(data);
    }
    const v = z
      .object({
        id: z.uuid(),
        action: z.enum([...statuses, 'reschedule']),
        start: z.iso.datetime({ offset: true }).optional(),
        reason: z.string().max(2000).default(''),
      })
      .parse(input);
    const { error } = await privileged().rpc('change_booking', {
      p_id: v.id,
      p_action: v.action,
      p_new_start: v.start ?? null,
      p_actor: staff.id,
      p_reason: v.reason,
    });
    if (error) throw error;
    return ok({ success: true });
  } catch (e) {
    return failure(e);
  }
}
