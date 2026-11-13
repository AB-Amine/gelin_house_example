import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { entitySchema } from '@/lib/admin-config';
import { sessionDb } from '@/lib/supabase';
import { body, failure, ok, sameOrigin } from '@/lib/http';
const schema = z.strictObject({
  kind: z.enum(['promotion', 'employee']),
  data: z.unknown(),
  services: z
    .array(z.uuid())
    .max(1000)
    .refine((ids) => new Set(ids).size === ids.length),
  hours: z
    .array(
      z
        .strictObject({
          weekday: z.number().int().min(0).max(6),
          opens: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
          closes: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
        })
        .refine((h) => h.opens < h.closes),
    )
    .max(200)
    .default([]),
});
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireStaff();
    const v = schema.parse(await body(req, 256000));
    const data = entitySchema(
      v.kind === 'promotion' ? 'promotions' : 'staff',
    ).parse(v.data);
    if (v.kind === 'employee' && data.kind !== 'staff')
      throw Error('FORBIDDEN');
    if (v.kind === 'promotion' && !v.services.length)
      throw Error('INVALID_SERVICES');
    const { data: result, error } = await (
      await sessionDb()
    ).rpc('admin_owner_form', {
      p_kind: v.kind,
      p_data: data,
      p_services: v.services,
      p_hours: v.hours,
    });
    if (error) throw error;
    return ok(result);
  } catch (error) {
    return failure(error);
  }
}
