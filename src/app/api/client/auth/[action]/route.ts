import { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, failure, ok, rateLimit, sameOrigin } from '@/lib/http';
import { sessionDb } from '@/lib/supabase';
import { phoneSchema } from '@/lib/domain';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(req);
    const { action } = await params;
    await rateLimit(req, `client-auth-${action}`, action === 'login' ? 10 : 5);
    const input = await body(req);
    const db = await sessionDb();
    const base = z.object({ email: z.email().max(254) });
    const password = z.string().min(12).max(128);
    const app = new URL(process.env.APP_URL ?? 'http://127.0.0.1:3000').origin;
    if (action === 'register') {
      const v = base
        .extend({
          password,
          name: z.string().trim().min(2).max(120),
          phone: phoneSchema,
          locale: z.enum(['fr', 'ar', 'en']).default('fr'),
        })
        .parse(input);
      const { data, error } = await db.auth.signUp({
        email: v.email,
        password: v.password,
        options: {
          emailRedirectTo: `${app}/auth/callback?next=/client`,
          data: { name: v.name, phone: v.phone, locale: v.locale },
        },
      });
      if (error) throw Error('AUTH_FAILED');
      if (data.session) {
        const { error: profileError } = await db.rpc('client_profile', {
          p_name: v.name,
          p_phone: v.phone,
          p_locale: v.locale,
        });
        if (profileError) throw profileError;
      }
      return ok({ authenticated: !!data.session, message: 'auth.verify' });
    }
    if (action === 'login') {
      const v = base
        .extend({ password: z.string().min(1).max(128) })
        .parse(input);
      const { error } = await db.auth.signInWithPassword(v);
      if (error) throw Error('AUTH_FAILED');
      return ok({ authenticated: true });
    }
    if (action === 'reset') {
      const v = base.parse(input);
      const { error } = await db.auth.resetPasswordForEmail(v.email, {
        redirectTo: `${app}/auth/callback?next=/client/password`,
      });
      if (error) throw Error('UNAVAILABLE');
      return ok({ message: 'auth.resetSent' });
    }
    if (action === 'password') {
      const v = z.object({ password }).parse(input);
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw Error('FORBIDDEN');
      const { error } = await db.auth.updateUser(v);
      if (error) throw error;
      return ok({ message: 'auth.passwordSaved' });
    }
    if (action === 'logout') {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return ok({ success: true });
    }
    throw Error('FORBIDDEN');
  } catch (e) {
    return failure(e);
  }
}
