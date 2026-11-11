'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n, LanguageSwitcher } from './locale-provider';
import type { Catalog } from '@/lib/domain';
import { salonImage } from '@/lib/assets';
import { BasketLink } from './basket';
import { localizedCatalog } from '@/lib/localization';
export function FatuWordmark() {
  return (
    <Link className="fatu-wordmark" href="/" aria-label="Fatu Makeup Artist">
      <span>FATU</span>
      <small>MAKEUP ARTIST</small>
    </Link>
  );
}
export function FatuPublicFrame({
  catalog,
  unavailable,
  children,
}: {
  catalog: Catalog;
  unavailable: boolean;
  children: ReactNode;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const settings = localizedCatalog(catalog, locale).settings;
  const links = [
    ['/', 'nav.home'],
    ['/a-propos', 'nav.about'],
    ['/services', 'nav.services'],
    ['/portfolio', 'nav.portfolio'],
    ['/contact', 'nav.contact'],
  ];
  return (
    <div
      className="fatu-public"
      style={
        { '--fatu-accent': settings?.brand_color ?? '#B89B72' } as CSSProperties
      }
    >
      <header className="fatu-header">
        {settings?.logo_path ? (
          <Link href="/">
            <Image
              src={salonImage(settings.logo_path)}
              alt="Fatu Makeup Artist"
              width={160}
              height={64}
              unoptimized
            />
          </Link>
        ) : (
          <FatuWordmark />
        )}
        <button
          type="button"
          className="fatu-menu"
          aria-controls="fatu-navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {t(open ? 'nav.close' : 'nav.menu')}
          <span aria-hidden>{open ? '×' : '☰'}</span>
        </button>
        <nav
          id="fatu-navigation"
          className={open ? 'is-open' : ''}
          aria-label={t('nav.menu')}
        >
          {links.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="fatu-header-actions">
          <LanguageSwitcher />
          <Link className="fatu-account-link" href="/client">
            {t('nav.client')}
          </Link>
          <Link className="fatu-button fatu-header-book" href="/reservation">
            {t('nav.booking')} <span aria-hidden>↗</span>
          </Link>
        </div>
      </header>
      {unavailable && (
        <div className="fatu-onboarding">
          <span>{t('common.setup')}</span>
          {process.env.NODE_ENV === 'development' && (
            <Link href="/admin/preview">{t('admin.preview')} ↗</Link>
          )}
        </div>
      )}
      <main id="main">{children}</main>
      <footer className="fatu-footer">
        <div className="fatu-footer-top">
          <div>
            <FatuWordmark />
            <p>{t('brand.signature')}</p>
          </div>
          <div>
            <span className="fatu-eyebrow">{t('footer.connect')}</span>
            <a
              href={
                settings?.instagram ||
                'https://www.instagram.com/fatu_makeupartist/'
              }
              target="_blank"
              rel="noreferrer"
            >
              Instagram ↗
            </a>
            {settings?.phone && (
              <a href={`tel:${settings.phone}`}>{settings.phone}</a>
            )}
            <Link href="/contact">{t('nav.contact')}</Link>
          </div>
          <div>
            <Link href="/services">{t('nav.services')}</Link>
            <Link href="/portfolio">{t('nav.portfolio')}</Link>
            <Link href="/faq">{t('nav.faq')}</Link>
            <Link href="/client">{t('nav.client')}</Link>
          </div>
          <div>
            <Link className="fatu-button fatu-button-light" href="/reservation">
              {t('nav.booking')} ↗
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
        <div className="fatu-footer-bottom">
          <small>
            © {new Date().getFullYear()} {t('footer.copy')}
          </small>
          <Link href="/confidentialite">{t('footer.privacy')}</Link>
          <Link href="/admin/login">{t('nav.admin')}</Link>
        </div>
      </footer>
      <div className="fatu-floating-basket">
        <BasketLink />
      </div>
    </div>
  );
}
export function FatuClientShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <div className="fatu-client">
      <header className="fatu-client-top">
        <FatuWordmark />
        <div>
          <LanguageSwitcher />
          <Link className="fatu-text-link" href="/">
            {t('admin.visit')} ↗
          </Link>
        </div>
      </header>
      <div className="fatu-client-layout">
        <aside>
          <span className="fatu-eyebrow">{t('client.title')}</span>
          <nav aria-label={t('nav.client')}>
            {[
              ['/client', 'client.dashboard'],
              ['/client/bookings', 'client.bookings'],
              ['/client/profile', 'client.profile'],
            ].map(([href, key]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? 'page' : undefined}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <Link className="fatu-button" href="/reservation">
            {t('nav.booking')} ↗
          </Link>
          <p>{t('client.private')}</p>
        </aside>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
