import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { body, failure, ok, sameOrigin } from '@/lib/http';
import { privileged, sessionDb } from '@/lib/supabase';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const owner = await requireStaff(true, true);
    const input = z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('invite'),
          email: z.email(),
          name: z.string().trim().min(2).max(120),
          role: z.enum(['manager', 'staff']),
        }),
        z.object({
          action: z.literal('update'),
          id: z.uuid(),
          role: z.enum(['owner', 'manager', 'staff']),
          active: z.boolean(),
        }),
      ])
      .parse(await body(req));
    if (input.action === 'update') {
      const { error } = await (
        await sessionDb()
      ).rpc('owner_update_access', {
        p_id: input.id,
        p_role: input.role,
        p_active: input.active,
      });
      if (error) throw error;
      return ok({ success: true });
    }
    const db = privileged();
    const { data, error } = await db.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${process.env.APP_URL}/auth/callback`,
    });
    if (error || !data.user) throw Error('INVITE_FAILED');
    const { error: insertError } = await db
      .from('admin_profiles')
      .insert({ id: data.user.id, display_name: input.name, role: input.role });
    if (insertError) {
      throw insertError;
    }
    await db.from('audit_logs').insert({
      actor: owner.id,
      action: 'invite',
      entity: 'admin_profiles',
      entity_id: data.user.id,
    });
    return ok({ success: true });
  } catch (e) {
    return failure(e);
  }
}
