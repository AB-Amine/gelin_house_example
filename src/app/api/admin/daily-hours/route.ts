import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { body, failure, ok, sameOrigin } from '@/lib/http';
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  days: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .default([0, 1, 2, 3, 4, 5, 6]),
  hours: z
    .array(
      z.object({ opens: time, closes: time }).refine((h) => h.opens < h.closes),
    )
    .min(1)
    .max(10),
});
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireStaff();
    const v = schema.parse(await body(req));
    const { error } = await (
      await sessionDb()
    ).rpc('save_salon_week', { p_hours: v.hours, p_days: v.days });
    if (error) throw error;
    return ok({ saved: true });
  } catch (error) {
    return failure(error);
  }
}
