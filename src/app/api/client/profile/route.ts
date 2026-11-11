import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireClient } from '@/lib/client-auth';
import { phoneSchema } from '@/lib/domain';
import { body, failure, ok, sameOrigin } from '@/lib/http';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { db } = await requireClient();
    const v = z
      .object({
        name: z.string().trim().min(2).max(120),
        phone: phoneSchema,
        locale: z.enum(['fr', 'ar', 'en']),
      })
      .parse(await body(req));
    const { data, error } = await db.rpc('client_profile', {
      p_name: v.name,
      p_phone: v.phone,
      p_locale: v.locale,
    });
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
