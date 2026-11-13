'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import type { Catalog, Quote } from '@/lib/domain';
import { fatuBookingSchema } from '@/lib/fatu-schemas';
import { api, ApiError, randomToken } from '@/lib/client';
import { useBasket } from './basket';
import { useWebsiteCopy } from './website-copy';
import { ServiceCatalog } from './catalog';
type Intent = z.infer<typeof fatuBookingSchema>;
type CityQuote = Quote & {
  travel_fee_minor: number;
  currency: string;
  city_name: string;
};
export function FatuBooking({
  catalog: initial,
  manual = false,
}: {
  catalog: Catalog;
  manual?: boolean;
}) {
  const {
    t,
    money,
    date: formatDate,
    time: formatTime,
    catalog,
  } = useWebsiteCopy(initial);
  const basket = useBasket();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState('');
  const [code, setCode] = useState('');
  const [day, setDay] = useState('');
  const [slots, setSlots] = useState<{ starts_at: string; ends_at: string }[]>(
    [],
  );
  const [searched, setSearched] = useState(false);
  const [quote, setQuote] = useState<CityQuote | null>(null);
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [result, setResult] = useState<{
    id: string;
    reference: string;
  } | null>(null);
  const [token, setToken] = useState('');
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    consent: false,
  });
  const generation = useRef(0);
  const services = basket.ids;
  const selected = services
    .map((id) => catalog.services.find((s) => s.id === id))
    .filter((s) => !!s);
  const cities = (catalog.cities ?? []).filter((c) =>
    services.every((id) =>
      catalog.service_cities?.some(
        (sc) => sc.city_id === c.id && sc.service_id === id,
      ),
    ),
  );
  const signature = services.join(',');
  const [previous, setPrevious] = useState(signature);
  if (previous !== signature) {
    setPrevious(signature);
    setStep(0);
    setQuote(null);
    setSlots([]);
    setCity('');
    setIntent(null);
  }
  useEffect(() => {
    generation.current++;
  }, [signature]);
  function reset() {
    generation.current++;
    setQuote(null);
    setSlots([]);
    setSearched(false);
    setStart('');
    setIntent(null);
    setError('');
  }
  function failed(e: unknown) {
    setError(e instanceof ApiError ? `error.${e.code}` : 'common.error');
  }
  async function load() {
    const ticket = ++generation.current;
    setBusy(true);
    setError('');
    setQuote(null);
    try {
      const s = await api<typeof slots>('/api/availability', {
        services,
        city,
        date: day,
        code,
      });
      if (ticket === generation.current) {
        setSlots(s);
        setSearched(true);
      }
    } catch (e) {
      if (ticket === generation.current) failed(e);
    } finally {
      setBusy(false);
    }
  }
  async function choose(value: string) {
    const ticket = ++generation.current;
    setBusy(true);
    setError('');
    setQuote(null);
    try {
      const q = await api<CityQuote>('/api/quote', {
        services,
        city,
        start: value,
        code,
      });
      if (ticket === generation.current) {
        setQuote(q);
        setStart(value);
      }
    } catch (e) {
      if (ticket === generation.current) failed(e);
    } finally {
      setBusy(false);
    }
  }
  async function submit(v: Intent) {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ id: string; reference: string }>(
        manual ? '/api/admin/fatu-booking' : '/api/bookings',
        v,
      );
      setResult(r);
      setToken(v.token);
      setIntent(null);
      basket.clear();
    } catch (e) {
      failed(e);
      if (
        e instanceof ApiError &&
        ['QUOTE_CHANGED', 'SLOT_UNAVAILABLE', 'PROMOTION_UNAVAILABLE'].includes(
          e.code,
        )
      ) {
        setIntent(null);
        setQuote(null);
        setStep(2);
      }
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <section className="fatu-receipt" role="status">
        <span className="fatu-eyebrow">{t('common.success')}</span>
        <h2>{t('booking.pending')}</h2>
        <p>
          {t('booking.reference')}: <strong>{result.reference}</strong>
        </p>
        <p>{t('common.notConfirmed')}</p>
        <p>{t('booking.private')}</p>
        <Link className="fatu-button" href={`/reservation/gestion#${token}`}>
          {t('common.details')} ↗
        </Link>
        <Link className="fatu-text-link" href="/client">
          {t('booking.account')}
        </Link>
      </section>
    );
  if (
    !catalog.settings?.booking_enabled ||
    !catalog.services.length ||
    !catalog.cities?.length
  )
    return (
      <section>
        <ServiceCatalog catalog={catalog} />
        <div className="fatu-empty">
          {basket.ids.length > 0 && (
            <div>
              {basket.ids.map((id) => (
                <div className="basket-row" key={id}>
                  <span>
                    {catalog.services.find((s) => s.id === id)?.name ??
                      t('common.unavailable')}
                  </span>
                  <button
                    className="fatu-text-link"
                    onClick={() => basket.remove(id)}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
          <Link className="fatu-text-link" href="/contact">
            {t('nav.contact')} ↗
          </Link>
        </div>
      </section>
    );
  const labels = [
    'booking.selection',
    'booking.location',
    'booking.slot',
    'booking.contact',
    'booking.review',
  ];
  const currency = quote?.currency ?? catalog.settings.currency ?? 'MAD';
  const tz = catalog.settings.timezone ?? 'Africa/Casablanca';
  return (
    <div className="fatu-booking">
      <ol className="fatu-steps">
        {labels.map((label, i) => (
          <li key={label} aria-current={step === i ? 'step' : undefined}>
            <span>0{i + 1}</span>
            {t(label)}
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="error">
          {t(error) === error ? t('common.error') : t(error)}
        </p>
      )}
      <section className="fatu-booking-panel">
        <h2>{t(labels[step])}</h2>
        {step === 0 && (
          <>
            <ServiceCatalog catalog={catalog} />
            <button
              className="fatu-button"
              disabled={!selected.length || selected.length !== services.length}
              onClick={() => setStep(1)}
            >
              {t('common.next')} ↗
            </button>
          </>
        )}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
          >
            <label>
              {t('booking.city')}
              <select
                required
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  reset();
                }}
              >
                <option value="">{t('booking.city')}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {money(c.travel_fee_minor, currency)}
                  </option>
                ))}
              </select>
            </label>
            {!cities.length && (
              <p className="notice">{t('error.CITY_SERVICE_UNAVAILABLE')}</p>
            )}
            <label>
              {t('booking.address')}
              <textarea
                required
                minLength={5}
                maxLength={500}
                autoComplete="street-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setIntent(null);
                }}
              />
            </label>
            <label>
              {t('booking.details')}
              <textarea
                maxLength={2000}
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  setIntent(null);
                }}
              />
            </label>
            <label>
              {t('booking.code')}
              <input
                maxLength={60}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  reset();
                }}
              />
            </label>
            <button className="fatu-button" disabled={!city}>
              {t('common.next')} ↗
            </button>
          </form>
        )}
        {step === 2 && (
          <>
            <div className="fatu-slot-search">
              <label>
                {t('booking.slot')}
                <input
                  type="date"
                  value={day}
                  min={Temporal.Now.plainDateISO(tz).toString()}
                  onChange={(e) => {
                    setDay(e.target.value);
                    reset();
                  }}
                />
              </label>
              <button
                className="fatu-button"
                disabled={busy || !day}
                onClick={load}
              >
                {t(busy ? 'common.loading' : 'common.search')}
              </button>
            </div>
            <p className="fatu-fine">{tz}</p>
            <div className="slot-grid">
              {slots.map((s) => (
                <button
                  disabled={busy}
                  className={start === s.starts_at ? 'selected' : ''}
                  aria-pressed={start === s.starts_at}
                  key={s.starts_at}
                  onClick={() => choose(s.starts_at)}
                >
                  {formatTime(s.starts_at, tz)}
                </button>
              ))}
            </div>
            {searched && !slots.length && (
              <p className="fatu-empty">{t('booking.noSlots')}</p>
            )}
            <button
              className="fatu-button"
              disabled={busy || !quote}
              onClick={() => setStep(3)}
            >
              {t('common.next')} ↗
            </button>
          </>
        )}
        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = fatuBookingSchema.safeParse({
                services,
                city,
                address,
                details,
                code,
                start,
                contact,
                key: crypto.randomUUID(),
                token: randomToken(),
                fingerprint: quote?.fingerprint,
              });
              if (!parsed.success) {
                setError('common.error');
                return;
              }
              setIntent(parsed.data);
              setStep(4);
              setError('');
            }}
          >
            {(['name', 'phone', 'email'] as const).map((key) => (
              <label key={key}>
                {t(key === 'name' ? 'auth.fullName' : `auth.${key}`)}
                <input
                  type={
                    key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
                  }
                  autoComplete={
                    key === 'name' ? 'name' : key === 'phone' ? 'tel' : 'email'
                  }
                  required={key !== 'email'}
                  minLength={key === 'name' ? 2 : undefined}
                  maxLength={key === 'name' ? 120 : key === 'phone' ? 30 : 254}
                  value={contact[key]}
                  onChange={(e) =>
                    setContact({ ...contact, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              {t('booking.details')}
              <textarea
                maxLength={2000}
                value={contact.notes}
                onChange={(e) =>
                  setContact({ ...contact, notes: e.target.value })
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                required
                checked={contact.consent}
                onChange={(e) =>
                  setContact({ ...contact, consent: e.target.checked })
                }
              />
              {t('booking.consent')}{' '}
              <Link href="/confidentialite" target="_blank">
                {t('footer.privacy')}
              </Link>
            </label>
            <button className="fatu-button">{t('common.next')} ↗</button>
          </form>
        )}
        {step === 4 && intent && quote && (
          <>
            <div className="fatu-summary">
              <p>
                {quote.city_name} · {address}
              </p>
              <p>
                {formatDate(start, {
                  dateStyle: 'full',
                  timeStyle: 'short',
                  timeZone: tz,
                })}
              </p>
              {quote.items.map((item) => (
                <div key={item.service_id}>
                  <span>
                    {item.name} · {item.duration_minutes} min
                  </span>
                  <strong>
                    {item.final_minor === null
                      ? t('services.consultation')
                      : money(item.final_minor, currency)}
                  </strong>
                </div>
              ))}
              <div>
                <span>{t('booking.travel')}</span>
                <strong>{money(quote.travel_fee_minor, currency)}</strong>
              </div>
              <div className="fatu-total">
                <span>{t('booking.total')}</span>
                <strong>{money(quote.total_minor, currency)}</strong>
              </div>
              <p>
                {intent.contact.name} · {intent.contact.phone}
              </p>
            </div>
            <p className="notice">{t('common.notConfirmed')}</p>
            <button
              className="fatu-button"
              disabled={busy}
              onClick={() => submit(intent)}
            >
              {t(busy ? 'common.saving' : 'booking.submit')} ↗
            </button>
          </>
        )}
        {step > 0 && (
          <button
            className="fatu-text-link fatu-back"
            disabled={busy}
            onClick={() => {
              setStep(step - 1);
              setIntent(null);
              setError('');
            }}
          >
            {t('common.back')}
          </button>
        )}
      </section>
    </div>
  );
}
