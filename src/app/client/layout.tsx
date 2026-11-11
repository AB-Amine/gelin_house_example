import { FatuClientShell } from '@/components/fatu-shell';
export const metadata = { robots: { index: false, follow: false } };
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FatuClientShell>{children}</FatuClientShell>;
}
