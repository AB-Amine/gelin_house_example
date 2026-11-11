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
      .object({ id: z.uuid(), reason: z.string().trim().min(5).max(300) })
      .parse(await body(req));
    const { error } = await (
      await sessionDb()
    ).rpc('anonymize_customer', { p_id: v.id, p_reason: v.reason });
    if (error) throw error;
    return ok({ success: true });
  } catch (e) {
    return failure(e);
  }
}
