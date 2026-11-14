'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useI18n, LanguageSwitcher } from './locale-provider';
import type { Catalog } from '@/lib/domain';
import { salonImage } from '@/lib/assets';
import { BasketLink } from './basket';
import { localizedCatalog } from '@/lib/localization';
import { BeautyIcon } from './beauty-icon';
export function FatuWordmark({ name }: { name?: string } = {}) {
  return (
    <Link className="fatu-wordmark" href="/" aria-label={name || 'GELIN HOUSE'}>
      <i className="salon-brand-heart">
        <BeautyIcon name="heart" />
      </i>
      <span>{name || 'GELIN HOUSE'}</span>
      <small>MAISON DE BEAUTÉ</small>
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
  const main = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = header.current;
    if (path !== '/' || !node) return;
    const measure = () =>
      node.parentElement?.style.setProperty(
        '--public-header-height',
        `${node.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
      node.parentElement?.style.removeProperty('--public-header-height');
    };
  }, [path]);
  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    main.current?.querySelectorAll('.premium-section').forEach((section) => {
      section.setAttribute('data-reveal', '');
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, [path]);
  const settings = localizedCatalog(catalog, locale).settings;
  const links = [
    ['/', 'nav.home'],
    ['/services', 'nav.services'],
    ['/offres', 'nav.offers'],
    ['/portfolio', 'nav.portfolio'],
    ['/a-propos', 'nav.about'],
    ['/contact', 'nav.contact'],
  ];
  return (
    <div
      className="fatu-public"
      style={
        { '--fatu-accent': settings?.brand_color ?? '#B89B72' } as CSSProperties
      }
    >
      <header ref={header} className="fatu-header">
        {settings?.logo_path ? (
          <Link href="/">
            <Image
              src={salonImage(settings.logo_path)}
              alt={settings.name}
              width={160}
              height={64}
              unoptimized
            />
          </Link>
        ) : (
          <FatuWordmark name={settings?.name} />
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
            <BeautyIcon name="calendar" /> {t('nav.booking')}
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
      <main ref={main} id="main">
        {children}
      </main>
      <footer className="fatu-footer">
        <div className="fatu-footer-top">
          <div>
            <FatuWordmark name={settings?.name} />
            <p>{t('brand.signature')}</p>
          </div>
          <div>
            <span className="fatu-eyebrow">{t('footer.connect')}</span>
            {settings?.instagram && (
              <a href={settings.instagram} target="_blank" rel="noreferrer">
                Instagram ↗
              </a>
            )}
            {settings?.phone && (
              <a href={`tel:${settings.phone}`}>{settings.phone}</a>
            )}
            <Link href="/contact">{t('nav.contact')}</Link>
          </div>
          <div>
            <Link href="/services">{t('nav.services')}</Link>
            <Link href="/offres">{t('nav.offers')}</Link>
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
            ©{' '}
            {catalog.as_of !== undefined &&
              new Date(catalog.as_of).getUTCFullYear()}{' '}
            {settings?.name || t('footer.copy')}
          </small>
          <Link href="/confidentialite">{t('footer.privacy')}</Link>
          <Link href="/admin/login">{t('nav.admin')}</Link>
        </div>
        <details className="public-image-disclosure">
          <summary>{t('images.disclosureTitle')}</summary>
          <p>
            {t('images.disclosureBody')}{' '}
            <a href="/images/premium/CREDITS.md">{t('images.sources')}</a>
          </p>
        </details>
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
    <div className="fatu-client" lang="fr" dir="ltr">
      <header className="fatu-client-top">
        <FatuWordmark />
        <div>
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
              ['/client', 'client.bookings'],
              ['/client/profile', 'client.profile'],
              ['/client/advantages', 'Mes avantages'],
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
