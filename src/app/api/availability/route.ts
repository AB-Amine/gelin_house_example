import { NextRequest } from 'next/server';
import { availabilitySchema } from '@/lib/domain';
import { body, failure, ok, rateLimit, sameOrigin } from '@/lib/http';
import { privileged } from '@/lib/supabase';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await rateLimit(req, 'availability', 60);
    const v = availabilitySchema.parse(await body(req));
    const { data, error } = await privileged().rpc('available_slots', {
      p_services: v.services,
      p_date: v.date,
    });
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
