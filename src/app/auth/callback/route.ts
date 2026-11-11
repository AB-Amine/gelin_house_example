import { NextRequest, NextResponse } from 'next/server';
import { sessionDb } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get('next');
  const target = ['/client', '/client/password', '/client/profile'].includes(
    next ?? '',
  )
    ? next!
    : '/admin/password';
  const login = target.startsWith('/client') ? '/client/login' : '/admin/login';
  try {
    const db = await sessionDb();
    const token = req.nextUrl.searchParams.get('token_hash');
    const type = req.nextUrl.searchParams.get('type');
    if (
      token &&
      (type === 'invite' ||
        type === 'recovery' ||
        type === 'signup' ||
        type === 'email' ||
        type === 'email_change')
    ) {
      const { error } = await db.auth.verifyOtp({ token_hash: token, type });
      if (!error) return NextResponse.redirect(new URL(target, req.url));
    }
    const code = req.nextUrl.searchParams.get('code');
    if (code) {
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(target, req.url));
    }
  } catch {}
  return NextResponse.redirect(new URL(`${login}?error=verification`, req.url));
}
