import { NextRequest } from 'next/server';
import { bookingSchema } from '@/lib/domain';
import {
  body,
  failure,
  ok,
  rateLimit,
  sameOrigin,
  tokenHash,
} from '@/lib/http';
import { privileged } from '@/lib/supabase';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await rateLimit(req, 'booking', 8);
    const v = bookingSchema.parse(await body(req));
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
    });
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
