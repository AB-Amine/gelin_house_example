import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { entities, entitySchema } from '@/lib/admin-config';
import { sessionDb } from '@/lib/supabase';
import { body, failure, ok, sameOrigin } from '@/lib/http';
import { phoneSchema } from '@/lib/domain';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  try {
    sameOrigin(req);
    const { entity } = await params;
    const config = entities[entity];
    if (!config) throw Error('FORBIDDEN');
    await requireStaff();
    const input = (
      entity === 'settings'
        ? entitySchema(entity)
            .partial()
            .extend({ id: z.literal(1) })
        : entitySchema(entity)
    ).parse(await body(req, 256000));
    if (config.table === 'customers') {
      input.phone = phoneSchema.parse(input.phone);
      input.email = z.union([z.email(), z.literal('')]).parse(input.email);
    }
    const db = await sessionDb();
    const { data, error } = await db.rpc('admin_save', {
      p_table: config.table,
      p_data: input,
    });
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  try {
    sameOrigin(req);
    const { entity } = await params;
    const config = entities[entity];
    if (!config?.deletable) throw Error('ARCHIVE_INSTEAD');
    await requireStaff();
    const input = z.object({ id: z.uuid() }).parse(await body(req));
    const { data, error } = await (
      await sessionDb()
    ).rpc('admin_save', {
      p_table: config.table,
      p_data: input,
      p_delete: true,
    });
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
