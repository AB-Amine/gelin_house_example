import type { Metadata } from 'next';
import { BasketProvider } from '@/components/basket';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://127.0.0.1:3000'),
  title: {
    default: 'GELIN HOUSE — Maison de beauté',
    template: '%s | GELIN HOUSE',
  },
  description:
    'Découvrez GELIN HOUSE, les prestations du salon et la réservation de votre moment de beauté.',
  openGraph: {
    title: 'GELIN HOUSE',
    description: 'Un moment pour vous.',
    locale: 'fr_MA',
    type: 'website',
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" dir="ltr">
      <body>
        <a className="skip-link" href="#main">
          Aller au contenu
        </a>
        <BasketProvider>{children}</BasketProvider>
      </body>
    </html>
  );
}
