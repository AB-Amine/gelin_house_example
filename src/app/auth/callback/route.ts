import { NextRequest, NextResponse } from 'next/server';
import { sessionDb } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  const tokenHash = req.nextUrl.searchParams.get('token_hash');
  const type = req.nextUrl.searchParams.get('type');
  if (tokenHash && (type === 'invite' || type === 'recovery')) {
    const { error } = await (
      await sessionDb()
    ).auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error)
      return NextResponse.redirect(new URL('/admin/password', req.url));
  }
  const code = req.nextUrl.searchParams.get('code');
  if (code) {
    const { error } = await (
      await sessionDb()
    ).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL('/admin/password', req.url));
  }
  return NextResponse.redirect(new URL('/admin/login?error=recovery', req.url));
}
