import 'server-only';
import { sessionDb } from './supabase';
import { redirect } from 'next/navigation';
export async function requirePageStaff() {
  const staff = await getStaff();
  if (!staff) redirect('/admin/login');
  return staff;
}
type SessionClient = Awaited<ReturnType<typeof sessionDb>>;
export async function getStaff(db?: SessionClient) {
  try {
    const client = db ?? (await sessionDb());
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return null;
    const { data: profile } = await client
      .from('admin_profiles')
      .select('id,display_name,role,active')
      .eq('id', user.id)
      .single();
    return profile?.active ? { ...profile, email: user.email } : null;
  } catch {
    return null;
  }
}
export async function requireStaff(db?: SessionClient) {
  const staff = await getStaff(db);
  if (!staff) throw Error('FORBIDDEN');
  return staff;
}
