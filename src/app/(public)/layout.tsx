import { Header, Footer } from '@/components/site-shell';
import { getCatalog } from '@/lib/catalog';
import type { CSSProperties } from 'react';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const { catalog } = await getCatalog();
  const s = catalog.settings;
  if (!s) return {};
  return {
    title: {
      default: `${s.name} — Maison de beauté`,
      template: `%s | ${s.name}`,
    },
    description: s.about.slice(0, 160) || undefined,
    ...(s.logo_path
      ? {
          icons: {
            icon: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/salon-images/${s.logo_path}`,
          },
        }
      : {}),
  };
}
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { catalog, unavailable } = await getCatalog();
  return (
    <div
      style={
        catalog.settings
          ? ({ '--rose': catalog.settings.brand_color } as CSSProperties)
          : undefined
      }
    >
      <Header settings={catalog.settings} />
      {(unavailable || !catalog.settings) && (
        <div className="status-banner" role="status">
          Le site se prépare. Les informations et la réservation seront
          disponibles après validation par le salon.
        </div>
      )}
      <main id="main">{children}</main>
      <Footer settings={catalog.settings} />
    </div>
  );
}
