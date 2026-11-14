'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Catalog, Service } from '@/lib/domain';
import { currentPrice } from '@/lib/domain';
import { groupServices } from '@/lib/service-catalogue';
import { salonImage } from '@/lib/assets';
import { useBasket } from './basket';
import { useWebsiteCopy } from './website-copy';
import { PremiumPhoto } from './premium-photo';
import { BeautyIcon } from './beauty-icon';
import { FloralMotif } from './floral-motif';
import styles from './prestations-catalogue.module.css';

function searchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .trim();
}

function ServiceSymbol({ label }: { label: string }) {
  const name = searchText(label);
  const path = /sourcil/.test(name)
    ? 'M2 15C6 6 17 6 22 14 14 11 8 11 2 15Z'
    : /cil/.test(name)
      ? 'M2 9c5 6 15 6 20 0M4 12l-2 4m7-2-1 4m7-4 1 4m4-6 2 4'
      : /ongl|manuc|gel|vernis/.test(name)
        ? 'M9 9V4a3 3 0 0 1 6 0v5m-6-3h6M8 9h8v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z'
        : /pedic|pied/.test(name)
          ? 'M14 2c-5 3-1 8-4 11-5 5-5 8-1 9 5 1 6-5 7-10 1-4 3-8-2-10ZM19 3l1 2'
          : /visage|soin/.test(name)
            ? 'M5 8c0-9 14-9 14 0v5c0 6-5 9-7 9s-7-3-7-9ZM8 10h1m6 0h1m-5 5h2m-4 3c2 1 4 1 6 0'
            : /epil|duvet/.test(name)
              ? 'M3 20 20 3M7 18c-5-2-4-7 1-10s9-6 13-6c0 4-3 10-6 13s-5 5-8 3ZM9 14l-1-5m4 2 4 1'
              : '';
  if (!path)
    return (
      <BeautyIcon
        name={
          /coiff|brushing|coupe|chignon|liss|capill/.test(name)
            ? 'scissors'
            : /caftan|location|accessoire/.test(name)
              ? 'hanger'
              : 'sparkle'
        }
      />
    );
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function CatalogueCard({
  service,
  catalog: initial,
}: {
  service: Service;
  catalog: Catalog;
}) {
  const { catalog, t, money } = useWebsiteCopy(initial);
  const basket = useBasket();
  const selected = basket.ids.includes(service.id);
  const price = currentPrice(service, catalog);
  const currency = catalog.settings?.currency ?? 'MAD';
  return (
    <article
      className={`official-service-card ${styles.card}`}
      data-service-id={service.id}
    >
      <span className={styles.symbol}>
        <ServiceSymbol label={`${service.subcategory ?? ''} ${service.name}`} />
      </span>
      <div className={styles.cardCopy}>
        <h3>
          <Link href={`/services/${service.slug}`}>{service.name}</Link>
        </h3>
        <p className={styles.price}>
          {service.price_type === 'consultation' || price.amount === null ? (
            t('catalogue.priceOnRequest')
          ) : (
            <>
              {service.price_type === 'starting' &&
                `${t('services.starting')} `}
              {price.promotion && (
                <del>{money(service.price_minor!, currency)} </del>
              )}
              {money(price.amount, currency)}
            </>
          )}
        </p>
        {price.promotion && (
          <small className={styles.promotion}>{price.promotion.name}</small>
        )}
      </div>
      {service.service_type === 'rental' ? (
        <Link
          className={styles.add}
          href={`/contact?prestation=${encodeURIComponent(service.slug)}`}
        >
          {t('catalogue.rentalEnquiry')}
        </Link>
      ) : (
        <button
          className={styles.add}
          aria-pressed={selected}
          disabled={!basket.ready || (!selected && basket.ids.length >= 10)}
          onClick={() =>
            selected ? basket.remove(service.id) : basket.add(service.id)
          }
        >
          <span aria-hidden>{selected ? '✓' : '+'}</span>{' '}
          {t(selected ? 'cataloguePage.added' : 'cataloguePage.add')}
        </button>
      )}
    </article>
  );
}

export function ServiceCatalog({
  catalog: initial,
  initialCategory = '',
}: {
  catalog: Catalog;
  initialCategory?: string;
}) {
  const { catalog, t, money } = useWebsiteCopy(initial);
  const basket = useBasket();
  const [category, setCategory] = useState(
    () =>
      catalog.categories.find(
        (c) => c.id === initialCategory || c.slug === initialCategory,
      )?.id ??
      catalog.categories[0]?.id ??
      '',
  );
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [basketOpen, setBasketOpen] = useState(false);
  const published = catalog.services.filter((s) => s.published && !s.archived);
  const categoryServices = published.filter((s) => s.category_id === category);
  const subcategories = [
    ...new Set(categoryServices.map((s) => s.subcategory ?? '')),
  ].filter(Boolean);
  const selectedSubcategory = subcategory ?? subcategories[0] ?? '*';
  const searching = searchText(query).length > 0;
  const services = searching
    ? published.filter((s) => searchText(s.name).includes(searchText(query)))
    : categoryServices.filter(
        (s) =>
          selectedSubcategory === '*' ||
          (s.subcategory ?? '') === selectedSubcategory,
      );
  const groups = groupServices(services);
  const selectedServices = basket.ids
    .map((id) =>
      published.find((s) => s.id === id && s.service_type !== 'rental'),
    )
    .filter((s): s is Service => !!s);
  const prices = selectedServices.map((s) => currentPrice(s, catalog).amount);
  const showTotal =
    selectedServices.length > 0 &&
    selectedServices.every((s) => s.price_type === 'fixed') &&
    prices.every((p) => p !== null);
  const currency = catalog.settings?.currency ?? 'MAD';
  const categoryLabel = (c: Catalog['categories'][number]) =>
    c.slug === 'makeup' && c.name === 'Makeup'
      ? t('aboutPage.category.makeup')
      : c.name;
  const categoryIcon = (slug: string) =>
    slug === 'coiffure'
      ? 'scissors'
      : slug === 'location'
        ? 'hanger'
        : slug === 'makeup'
          ? 'sparkle'
          : 'lotus';
  function selectCategory(id: string) {
    setCategory(id);
    setSubcategory(null);
    setQuery('');
  }
  function selectSubcategory(value: string) {
    setSubcategory(value);
    setQuery('');
  }

  return (
    <div className={styles.page} data-service-catalogue>
      <header className={styles.intro}>
        <FloralMotif className={styles.flowers} />
        <span className={styles.eyebrow}>{t('cataloguePage.eyebrow')}</span>
        <h1>{t('cataloguePage.title')}</h1>
        <p>{t('cataloguePage.intro')}</p>
      </header>
      <div className={styles.toolbar}>
        <div
          className={styles.categories}
          role="group"
          aria-label={t('nav.services')}
        >
          {catalog.categories.map((c) => (
            <button
              className={styles.category}
              key={c.id}
              aria-label={categoryLabel(c)}
              aria-pressed={!searching && category === c.id}
              onClick={() => selectCategory(c.id)}
            >
              {c.image_path ? (
                <Image
                  src={salonImage(c.image_path)}
                  alt=""
                  width={600}
                  height={320}
                  sizes="(max-width: 700px) 45vw, 20vw"
                  unoptimized
                />
              ) : (
                <PremiumPhoto
                  id={
                    c.slug === 'coiffure'
                      ? 'bridal-hair'
                      : c.slug === 'makeup'
                        ? 'rose-makeup'
                        : c.slug === 'location'
                          ? 'occasion-caftan'
                          : 'ritual-care'
                  }
                />
              )}
              <span>
                <BeautyIcon name={categoryIcon(c.slug)} />
                {categoryLabel(c)}
              </span>
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="7" />
            <path d="m15 15 7 7" />
          </svg>
          <span className={styles.srOnly}>{t('services.search')}</span>
          <input
            type="search"
            placeholder={`${t('services.search')}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className={styles.layout}>
        <nav
          className={styles.subcategories}
          aria-label={t('cataloguePage.subcategories')}
        >
          <button
            aria-pressed={!searching && selectedSubcategory === '*'}
            onClick={() => selectSubcategory('*')}
          >
            <span className={styles.allIcon} aria-hidden>
              ⠿
            </span>
            {t('common.all')}
          </button>
          {subcategories.map((name) => (
            <button
              key={name}
              aria-pressed={!searching && selectedSubcategory === name}
              onClick={() => selectSubcategory(name)}
            >
              <ServiceSymbol label={name} />
              {name}
            </button>
          ))}
        </nav>
        <div className={styles.results} id="catalogue-results">
          <span role="status" className={styles.srOnly}>
            {t('cataloguePage.results', { count: services.length })}
          </span>
          {searching && (
            <h2 className={styles.sectionTitle}>
              {t('cataloguePage.searchResults')}
            </h2>
          )}
          {groups.map((group, index) => (
            <section
              className={styles.group}
              key={JSON.stringify([
                group.category,
                group.subcategory,
                group.group,
              ])}
            >
              {(index === 0 ||
                groups[index - 1].subcategory !== group.subcategory ||
                groups[index - 1].category !== group.category) && (
                <h2 className={styles.sectionTitle}>
                  {group.subcategory ||
                    catalog.categories.find((c) => c.id === group.category)
                      ?.name ||
                    t('nav.services')}
                </h2>
              )}
              {group.group && (
                <h4 className={styles.groupTitle}>{group.group}</h4>
              )}
              <div className={styles.grid}>
                {group.services.map((service) => (
                  <CatalogueCard
                    service={service}
                    catalog={catalog}
                    key={service.id}
                  />
                ))}
              </div>
            </section>
          ))}
          {!services.length && (
            <div className={styles.empty}>
              <BeautyIcon name="lotus" />
              <p>
                {t(
                  published.length
                    ? 'services.noResults'
                    : 'home.services.empty',
                )}
              </p>
              {searching && (
                <button className={styles.add} onClick={() => setQuery('')}>
                  {t('cataloguePage.clearSearch')}
                </button>
              )}
            </div>
          )}
          {selectedServices.length > 0 && (
            <a
              className={styles.mobileResume}
              href="#catalogue-basket"
              onClick={() => setBasketOpen(true)}
            >
              {t('cataloguePage.basketTitle')} · {selectedServices.length}{' '}
              <span aria-hidden>↑</span>
            </a>
          )}
        </div>
        <aside
          className={styles.basket}
          id="catalogue-basket"
          aria-labelledby="catalogue-basket-title"
        >
          <h2 id="catalogue-basket-title">
            <BeautyIcon name="heart" />
            {t('cataloguePage.basketTitle')}
          </h2>
          <button
            className={styles.basketToggle}
            aria-expanded={basketOpen}
            aria-controls="catalogue-basket-content"
            onClick={() => setBasketOpen(!basketOpen)}
          >
            <BeautyIcon name="heart" />
            <span>
              {t('cataloguePage.basketTitle')}{' '}
              <small>({selectedServices.length})</small>
            </span>
            <span aria-hidden>{basketOpen ? '−' : '+'}</span>
          </button>
          <div
            className={styles.basketBody}
            data-open={basketOpen}
            id="catalogue-basket-content"
          >
            <p className={styles.basketIntro}>
              {t('cataloguePage.basketIntro')}
            </p>
            {selectedServices.length ? (
              <ul className={styles.selections}>
                {selectedServices.map((s) => (
                  <li key={s.id}>
                    <ServiceSymbol label={`${s.subcategory ?? ''} ${s.name}`} />
                    <span>{s.name}</span>
                    <button
                      aria-label={t('cataloguePage.remove', { name: s.name })}
                      onClick={() => basket.remove(s.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.basketEmpty}>
                {t('cataloguePage.basketEmpty')}
              </p>
            )}
            <div className={styles.basketFooter}>
              <p role="status">
                {t(
                  selectedServices.length === 1
                    ? 'cataloguePage.oneSelected'
                    : 'cataloguePage.selectedCount',
                  { count: selectedServices.length },
                )}
              </p>
              {showTotal && (
                <p className={styles.total}>
                  {t('booking.total')}{' '}
                  <strong>
                    {money(
                      prices.reduce<number>(
                        (sum, value) => sum + (value ?? 0),
                        0,
                      ),
                      currency,
                    )}
                  </strong>
                </p>
              )}
              {basket.ids.length >= 10 && (
                <p className={styles.limit}>{t('cataloguePage.limit')}</p>
              )}
              {selectedServices.length ? (
                <Link className={styles.continue} href="/reservation">
                  {t('cataloguePage.chooseDate')} <span aria-hidden>→</span>
                </Link>
              ) : (
                <button className={styles.continue} disabled>
                  {t('cataloguePage.chooseDate')} <span aria-hidden>→</span>
                </button>
              )}
              <p className={styles.confirmation}>
                <BeautyIcon name="calendar" />
                {t('cataloguePage.confirmation')}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
