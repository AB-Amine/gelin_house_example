import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { body, failure, ok, sameOrigin } from '@/lib/http';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireStaff();
    const v = z
      .object({
        appointment: z.uuid(),
        amount: z.number().int().positive().max(100000000),
        currency: z.string().regex(/^[A-Z]{3}$/),
        kind: z.enum(['payment', 'refund']),
        method: z.string().trim().min(2).max(80),
      })
      .parse(await body(req));
    const { data, error } = await (
      await sessionDb()
    ).rpc('record_payment', {
      p_appointment: v.appointment,
      p_amount: v.amount,
      p_currency: v.currency,
      p_kind: v.kind,
      p_method: v.method,
    });
    if (error) throw error;
    return ok({ id: data });
  } catch (e) {
    return failure(e);
  }
}
