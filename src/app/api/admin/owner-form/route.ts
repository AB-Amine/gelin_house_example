import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { entitySchema } from '@/lib/admin-config';
import { sessionDb } from '@/lib/supabase';
import { body, failure, ok, sameOrigin } from '@/lib/http';
import { revalidatePath } from 'next/cache';
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
    const staff = await requireStaff();
    const v = schema.parse(await body(req, 256000));
    if (v.kind === 'promotion' && staff.role !== 'owner')
      throw Error('OWNER_REQUIRED');
    const data = entitySchema(
      v.kind === 'promotion' ? 'promotions' : 'staff',
    ).parse(v.data);
    if (v.kind === 'employee' && data.kind !== 'staff')
      throw Error('FORBIDDEN');
    const { data: result, error } = await (
      await sessionDb()
    ).rpc('admin_owner_form', {
      p_kind: v.kind,
      p_data: data,
      p_services: v.services,
      p_hours: v.hours,
    });
    if (error) throw error;
    if (v.kind === 'promotion') {
      revalidatePath('/', 'page');
      revalidatePath('/offres', 'page');
      revalidatePath('/services', 'page');
    }
    return ok(result);
  } catch (error) {
    return failure(error);
  }
}
