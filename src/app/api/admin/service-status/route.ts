import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { body, failure, ok, sameOrigin } from '@/lib/http';
import { revalidatePath } from 'next/cache';
const schema = z.strictObject({
  id: z.uuid(),
  active: z.boolean(),
  confirmation: z.literal('CONFIRMER'),
});
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireStaff();
    const input = schema.parse(await body(req, 1000));
    const db = await sessionDb();
    const { data: existing, error: readError } = await db
      .from('services')
      .select('id')
      .eq('id', input.id)
      .single();
    if (readError || !existing) throw Error('SERVICE_UNAVAILABLE');
    // Reuse the deployed, authorized editor. No new column or booking rule.
    const { data, error } = await db.rpc('admin_save', {
      p_table: 'services',
      p_data: {
        id: input.id,
        published: input.active,
        ...(input.active ? { archived: false } : {}),
      },
    });
    if (error) throw error;
    if (
      data?.id !== input.id ||
      data.published !== input.active ||
      (input.active && data.archived)
    )
      throw Error('SERVICE_UNAVAILABLE');
    for (const path of ['/admin/services', '/', '/prestations', '/services'])
      revalidatePath(path, 'layout');
    return ok({
      saved: true,
      id: data.id,
      active: data.published && !data.archived,
    });
  } catch (e) {
    return failure(e);
  }
}
