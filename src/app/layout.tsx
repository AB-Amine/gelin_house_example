import type { Metadata } from 'next';
import { BasketProvider } from '@/components/basket';
import { LocaleProvider } from '@/components/locale-provider';
import { getI18n } from '@/lib/i18n/server';
import './globals.css';
import './experience.css';
import './fatu.css';
import './catalogue.css';
import './premium-public.css';
import './salon-editorial.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://127.0.0.1:3000'),
  title: { default: 'GELIN HOUSE', template: '%s | GELIN HOUSE' },
  description: 'GELIN HOUSE — une signature beauté, une attention personnelle.',
  openGraph: { title: 'GELIN HOUSE', type: 'website' },
  icons: { icon: '/images/branding/gelin-mark.svg' },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dir, t } = await getI18n();
  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          {t('nav.skip')}
        </a>
        <LocaleProvider locale={locale}>
          <BasketProvider>{children}</BasketProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
