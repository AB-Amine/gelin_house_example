import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireClient } from '@/lib/client-auth';
import { body, failure, ok, sameOrigin, rateLimit } from '@/lib/http';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { db } = await requireClient();
    await rateLimit(req, 'client-request', 10);
    const v = z
      .object({
        id: z.uuid(),
        kind: z.enum(['cancel', 'reschedule']),
        reason: z.string().trim().min(3).max(2000),
        start: z.iso.datetime({ offset: true }).nullable().default(null),
      })
      .parse(await body(req));
    const { data, error } = await db.rpc('client_request', {
      p_id: v.id,
      p_kind: v.kind,
      p_reason: v.reason,
      p_start: v.start,
    });
    if (error) throw error;
    return ok({ id: data });
  } catch (e) {
    return failure(e);
  }
}
