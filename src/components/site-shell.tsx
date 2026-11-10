import Link from 'next/link';
import Image from 'next/image';
import { BasketLink } from './basket';
import type { Settings } from '@/lib/domain';
export function Header({ settings }: { settings: Settings | null }) {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="GELIN HOUSE — Accueil">
        {settings?.logo_path ? (
          <Image
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/salon-images/${settings.logo_path}`}
            alt={settings.name}
            width={154}
            height={70}
            unoptimized
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <>
            {settings?.name && settings.name !== 'GELIN HOUSE' ? (
              settings.name
            ) : (
              <>
                GELIN<span>HOUSE</span>
              </>
            )}
            <small>MAISON DE BEAUTÉ</small>
          </>
        )}
      </Link>
      <nav aria-label="Navigation principale">
        <Link href="/services">Les prestations</Link>
        <Link href="/offres">Les offres</Link>
        <Link href="/galerie">La galerie</Link>
        <Link href="/a-propos">La maison</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <BasketLink />
    </header>
  );
}
export function Footer({ settings }: { settings: Settings | null }) {
  return (
    <footer className="site-footer">
      <div>
        <Link className="footer-brand" href="/">
          GELIN HOUSE
        </Link>
        <p>Un moment pour vous.</p>
      </div>
      <div>
        <Link href="/services">Les prestations</Link>
        <Link href="/contact">Nous contacter</Link>
        <Link href="/confidentialite">Confidentialité & réservation</Link>
      </div>
      <div>
        {settings?.instagram && (
          <a href={settings.instagram} target="_blank" rel="noreferrer">
            Instagram ↗
          </a>
        )}
        {settings?.phone && (
          <a href={`tel:${settings.phone}`}>{settings.phone}</a>
        )}
        <small>© {new Date().getFullYear()} GELIN HOUSE</small>
      </div>
    </footer>
  );
}
export function Placeholder({
  label = 'Photographies du salon à venir',
  large = false,
}: {
  label?: string;
  large?: boolean;
}) {
  return (
    <div
      className={`photo-placeholder ${large ? 'large' : ''}`}
      role="img"
      aria-label={label}
    >
      <div className="arch-line" />
      <div className="arch-line second" />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="eyebrow">GELIN HOUSE</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
