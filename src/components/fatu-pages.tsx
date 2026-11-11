'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Catalog } from '@/lib/domain';
import { salonImage } from '@/lib/assets';
import { useI18n } from './locale-provider';
import { useWebsiteCopy } from './website-copy';
import { FatuPhoto } from './fatu-photo';
export function FatuHeading({ title, body }: { title: string; body?: string }) {
  const { t } = useI18n();
  return (
    <header className="fatu-page-heading">
      <span className="fatu-eyebrow">FATU MAKEUP ARTIST</span>
      <h1>{t(title)}</h1>
      {body && <p>{t(body)}</p>}
    </header>
  );
}
export function FatuFaq({ catalog: initial }: { catalog: Catalog }) {
  const { t, catalog } = useWebsiteCopy(initial);
  const faqs = catalog.content.filter((c) => c.key.startsWith('faq.'));
  return (
    <div className="fatu-faq">
      <div>
        <span className="fatu-eyebrow">{t('nav.faq')}</span>
        <h2>{t('home.faq.title')}</h2>
      </div>
      <div>
        {faqs.length ? (
          faqs.map((f) => (
            <details key={f.key}>
              <summary>
                {f.title}
                <span aria-hidden>+</span>
              </summary>
              <p>{f.body}</p>
            </details>
          ))
        ) : (
          <p className="fatu-empty">{t('faq.empty')}</p>
        )}
        <Link className="fatu-text-link" href="/contact">
          {t('nav.contact')} ↗
        </Link>
      </div>
    </div>
  );
}
export function FatuAbout({ catalog: initial }: { catalog: Catalog }) {
  const { t, catalog } = useWebsiteCopy(initial);
  return (
    <div className="fatu-container">
      <FatuHeading title="home.about.title" body="home.about.body" />
      <div className="fatu-split fatu-section">
        <FatuPhoto id="brushes" />
        <div>
          <span className="fatu-eyebrow">{t('brand.artist')}</span>
          <h2>{t('brand.signature')}</h2>
          <p className="prose">
            {catalog.settings?.about || t('about.pending')}
          </p>
          <p className="fatu-fine">{t('image.portraitPending')}</p>
          <Link className="fatu-button" href="/contact">
            {t('nav.contact')} ↗
          </Link>
        </div>
      </div>
      {catalog.content
        .filter((c) => c.key.startsWith('about.'))
        .map((c) => (
          <section className="fatu-section" key={c.key}>
            <h2>{c.title}</h2>
            <p className="prose">{c.body}</p>
          </section>
        ))}
    </div>
  );
}
export function FatuPortfolio({ catalog: initial }: { catalog: Catalog }) {
  const { t, catalog } = useWebsiteCopy(initial);
  const [album, setAlbum] = useState('all');
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const images = catalog.gallery.filter(
    (g) => album === 'all' || g.album === album,
  );
  useEffect(() => {
    const d = dialog.current;
    return () => d?.close();
  }, []);
  function open(i: number, button: HTMLButtonElement) {
    trigger.current = button;
    setIndex(i);
    dialog.current?.showModal();
  }
  return (
    <div className="fatu-container">
      <FatuHeading title="nav.portfolio" body="portfolio.body" />
      <div className="filter-tabs">
        <button aria-pressed={album === 'all'} onClick={() => setAlbum('all')}>
          {t('common.all')}
        </button>
        {[...new Set(catalog.gallery.map((g) => g.album))]
          .filter(Boolean)
          .map((a) => (
            <button
              aria-pressed={album === a}
              key={a}
              onClick={() => setAlbum(a)}
            >
              {a}
            </button>
          ))}
      </div>
      {images.length ? (
        <div className="fatu-portfolio-grid">
          {images.map((g, i) => (
            <button
              className="fatu-image-button"
              key={g.id}
              aria-label={`${t('portfolio.open')} — ${g.alt}`}
              onClick={(e) => open(i, e.currentTarget)}
            >
              <Image
                src={salonImage(g.path)}
                alt={g.alt}
                width={720}
                height={960}
                unoptimized
              />
              <span>{g.title || g.alt} ↗</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="fatu-empty">{t('portfolio.empty')}</p>
          <p>{t('portfolio.inspiration')}</p>
          <div className="fatu-portfolio-grid">
            <FatuPhoto id="editorial-colour" />
            <FatuPhoto id="artistry" />
          </div>
        </>
      )}
      <dialog
        ref={dialog}
        className="fatu-lightbox"
        onClose={() => trigger.current?.focus()}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
          if (e.key === 'ArrowLeft')
            setIndex((i) => (i + images.length - 1) % images.length);
        }}
      >
        <button
          autoFocus
          onClick={() => dialog.current?.close()}
          aria-label={t('portfolio.close')}
        >
          ×
        </button>
        {images[index] && (
          <Image
            src={salonImage(images[index].path)}
            alt={images[index].alt}
            width={1200}
            height={1400}
            unoptimized
          />
        )}
        {images[index]?.title && <h2>{images[index].title}</h2>}
        {images[index]?.description && <p>{images[index].description}</p>}
        {images[index]?.video_url?.startsWith('https://') && (
          <a
            className="fatu-text-link"
            href={images[index].video_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('portfolio.video')} ↗
          </a>
        )}
        <div>
          <button
            disabled={images.length < 2}
            onClick={() =>
              setIndex((i) => (i + images.length - 1) % images.length)
            }
          >
            {t('portfolio.previous')}
          </button>
          <button
            disabled={images.length < 2}
            onClick={() => setIndex((i) => (i + 1) % images.length)}
          >
            {t('portfolio.next')}
          </button>
        </div>
      </dialog>
    </div>
  );
}
