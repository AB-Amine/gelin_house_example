import { NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { fatuBookingSchema } from '@/lib/fatu-schemas';
import { body, failure, ok, sameOrigin, tokenHash } from '@/lib/http';
import { privileged } from '@/lib/supabase';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const staff = await requireStaff();
    const v = fatuBookingSchema.parse(await body(req));
    const { data, error } = await privileged().rpc('create_fatu_booking', {
      p_services: v.services,
      p_start: v.start,
      p_city: v.city,
      p_address: v.address,
      p_details: v.details,
      p_code: v.code,
      p_name: v.contact.name,
      p_phone: v.contact.phone,
      p_email: v.contact.email,
      p_notes: v.contact.notes,
      p_key: v.key,
      p_token_hash: tokenHash(v.token),
      p_fingerprint: v.fingerprint,
      p_source: 'other',
      p_actor: staff.id,
    });
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
