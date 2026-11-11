'use client';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useLocalCatalog } from '@/lib/demo-store';
import type { Catalog } from '@/lib/domain';
import { Header, Footer } from './site-shell';
export function LocalSiteFrame({
  initialCatalog,
  children,
}: {
  initialCatalog: Catalog;
  children: ReactNode;
}) {
  const catalog = useLocalCatalog(initialCatalog);
  return (
    <div
      style={
        {
          '--rose': catalog.settings?.brand_color ?? '#8b5147',
        } as CSSProperties
      }
    >
      <div className="local-demo-banner">
        <span>
          <i aria-hidden /> Atelier local · Prestations et tarifs de
          démonstration
        </span>
        <Link href="/admin/preview">Personnaliser dans le dashboard ↗</Link>
      </div>
      <Header settings={catalog.settings} />
      <main id="main">{children}</main>
      <Footer settings={catalog.settings} demo />
    </div>
  );
}
