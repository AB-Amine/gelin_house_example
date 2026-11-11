import 'server-only';
import { sessionDb, publicConfig } from './supabase';
import { redirect } from 'next/navigation';
export async function clientSession() {
  if (!publicConfig()) return null;
  const db = await sessionDb();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  return error || !user ? null : { db, user };
}
export async function requireClient() {
  const session = await clientSession();
  if (!session) throw Error('FORBIDDEN');
  return session;
}
export async function requirePageClient() {
  const session = await clientSession();
  if (!session) redirect('/client/login');
  return session;
}
