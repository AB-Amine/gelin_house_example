import { NextRequest } from 'next/server';
import { slotSchema } from '@/lib/domain';
import { body, failure, ok, rateLimit, sameOrigin } from '@/lib/http';
import { privileged } from '@/lib/supabase';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await rateLimit(req, 'quote', 60);
    const v = slotSchema.parse(await body(req));
    const { data, error } = await privileged().rpc('quote_booking', {
      p_services: v.services,
      p_start: v.start,
    });
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
