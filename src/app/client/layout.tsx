import { FatuClientShell } from '@/components/fatu-shell';
import { LocaleProvider } from '@/components/locale-provider';
export const metadata = { robots: { index: false, follow: false } };
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider locale="fr">
      <FatuClientShell>{children}</FatuClientShell>
    </LocaleProvider>
  );
}
