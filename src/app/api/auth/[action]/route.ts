import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sessionDb } from '@/lib/supabase';
import { body, failure, ok, rateLimit, sameOrigin } from '@/lib/http';
import { requireStaff } from '@/lib/auth';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(req);
    const { action } = await params;
    await rateLimit(req, `auth-${action}`, 6);
    const db = await sessionDb();
    if (action === 'logout') {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return ok({ success: true });
    }
    if (action === 'login') {
      const v = z
        .object({ email: z.email(), password: z.string().min(1).max(128) })
        .parse(await body(req));
      const { error } = await db.auth.signInWithPassword(v);
      if (error) throw Error('FORBIDDEN');
      try {
        await requireStaff();
      } catch {
        await db.auth.signOut();
        throw Error('FORBIDDEN');
      }
      return ok({ success: true });
    }
    if (action === 'reset') {
      const v = z.object({ email: z.email() }).parse(await body(req));
      await db.auth.resetPasswordForEmail(v.email, {
        redirectTo: `${process.env.APP_URL}/auth/callback`,
      });
      return ok({
        message:
          'Si ce compte est autorisé, les instructions seront envoyées par e-mail.',
      });
    }
    if (action === 'password') {
      await requireStaff();
      const v = z
        .object({ password: z.string().min(12).max(128) })
        .parse(await body(req));
      const { error } = await db.auth.updateUser(v);
      if (error) throw error;
      return ok({ message: 'Mot de passe mis à jour.' });
    }
    throw Error('FORBIDDEN');
  } catch (e) {
    return failure(e);
  }
}
