import 'server-only';
import { sessionDb } from './supabase';
import { redirect, notFound } from 'next/navigation';
export async function requirePageStaff(manage = false, owner = false) {
  const staff = await getStaff();
  if (!staff) redirect('/admin/login');
  if ((manage && staff.role === 'staff') || (owner && staff.role !== 'owner'))
    notFound();
  return staff;
}
export async function getStaff() {
  try {
    const db = await sessionDb();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user) return null;
    const { data: profile } = await db
      .from('admin_profiles')
      .select('id,display_name,role,active')
      .eq('id', user.id)
      .single();
    return profile?.active ? { ...profile, email: user.email } : null;
  } catch {
    return null;
  }
}
export async function requireStaff(manage = false, owner = false) {
  const staff = await getStaff();
  if (
    !staff ||
    (manage && staff.role === 'staff') ||
    (owner && staff.role !== 'owner')
  )
    throw Error('FORBIDDEN');
  return staff;
}
