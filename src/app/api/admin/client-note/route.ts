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
        id: z.uuid(),
        kind: z.enum(['account', 'guest']),
        note: z.string().max(5000),
      })
      .parse(await body(req));
    const { error } = await (
      await sessionDb()
    ).rpc('admin_client_note', { p_id: v.id, p_kind: v.kind, p_note: v.note });
    if (error) throw error;
    return ok({ success: true });
  } catch (e) {
    return failure(e);
  }
}
