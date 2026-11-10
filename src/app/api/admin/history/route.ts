import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { failure, ok } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    await requireStaff();
    const id = z.uuid().parse(req.nextUrl.searchParams.get('id'));
    const { data, error } = await (
      await sessionDb()
    )
      .from('appointment_history')
      .select('action,created_at,actor')
      .eq('appointment_id', id)
      .order('created_at')
      .limit(200);
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return failure(e);
  }
}
