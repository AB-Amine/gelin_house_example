import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/auth';
import { AdminShell } from '@/components/admin-shell';
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaff();
  if (!staff) redirect('/admin/login');
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
