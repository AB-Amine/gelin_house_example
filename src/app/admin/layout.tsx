import './admin.css';
import { LocaleProvider } from '@/components/locale-provider';
export const metadata = {
  title: { absolute: 'Administration | GELIN HOUSE' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="fr">
      <div lang="fr" dir="ltr">
        {children}
      </div>
    </LocaleProvider>
  );
}
