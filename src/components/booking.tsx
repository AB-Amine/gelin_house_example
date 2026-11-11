'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBasket } from './basket';
import {
  contactSchema,
  bookingSchema,
  dateLabel,
  money,
  priceLabel,
  currentPrice,
  timeLabel,
  type Catalog,
  type Quote,
  type ManagedBooking,
} from '@/lib/domain';
import { api, ApiError, errorMessage, randomToken } from '@/lib/client';
import { useLocalCatalog } from '@/lib/demo-store';
import { demoRequest } from '@/lib/demo-booking';
type Intent = z.infer<typeof bookingSchema> & { manualSource?: string };
type Success = {
  reference: string;
  id: string;
  status: string;
  booking: ManagedBooking;
};
export function Booking({
  catalog: initialCatalog,
  manual = false,
}: {
  catalog: Catalog;
  manual?: boolean;
}) {
  const catalog = useLocalCatalog(initialCatalog);
  const request = catalog.demo ? demoRequest : api;
  const basket = useBasket();
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<{ starts_at: string; ends_at: string }[]>(
    [],
  );
  const [start, setStart] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<Success | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [source, setSource] = useState('phone');
  const [management, setManagement] = useState('');
  const counter = useRef(0);
  const storageKey = catalog.demo
    ? 'gh-demo-intent'
    : manual
      ? 'gh-manual-intent'
      : 'gh-intent';
  const form = useForm<
    z.input<typeof contactSchema>,
    unknown,
    z.output<typeof contactSchema>
  >({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', phone: '', email: '', notes: '' },
  });
  const stored = useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback);
      return () => window.removeEventListener('storage', callback);
    },
    () => {
      try {
        return sessionStorage.getItem(storageKey) ?? '';
      } catch {
        return '';
      }
    },
    () => '',
  );
  const savedIntent = useMemo(() => {
    try {
      const value = bookingSchema
        .extend({
          manualSource: z
            .enum(['phone', 'whatsapp', 'instagram', 'walk_in', 'other'])
            .optional(),
        })
        .safeParse(JSON.parse(stored));
      return value.success ? value.data : null;
    } catch {
      return null;
    }
  }, [stored]);
  const activeIntent = intent ?? savedIntent;
  const selected = basket.ids
    .map((id) => catalog.services.find((s) => s.id === id))
    .filter((s) => !!s);
  const invalid = basket.ids.some(
    (id) => !catalog.services.some((s) => s.id === id && s.bookable),
  );
  const estimate = selected.reduce(
    (sum, service) => sum + (currentPrice(service, catalog).amount ?? 0),
    0,
  );
  const uncertain = selected.some((service) => service.price_type !== 'fixed');
  const signature = basket.ids.join(',');
  const [previousSelection, setPreviousSelection] = useState(signature);
  // Reset dependent state before rendering a different selection so old server
  // quotes are never briefly submittable after a cross-tab basket change.
  if (previousSelection !== signature) {
    setPreviousSelection(signature);
    setSlots([]);
    setQuote(null);
    setStart('');
    setSearched(false);
  }
  useEffect(() => {
    counter.current++;
  }, [signature]);
  async function loadSlots() {
    const ticket = ++counter.current;
    setBusy(true);
    setError('');
    setQuote(null);
    setStart('');
    try {
      const data = await request<typeof slots>('/api/availability', {
        services: basket.ids,
        date,
      });
      if (ticket === counter.current) {
        setSlots(data);
        setSearched(true);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function selectSlot(value: string) {
    const ticket = ++counter.current;
    setStart(value);
    setQuote(null);
    setBusy(true);
    setError('');
    try {
      const valueQuote = await request<Quote>('/api/quote', {
        services: basket.ids,
        start: value,
      });
      if (ticket === counter.current) setQuote(valueQuote);
    } catch (e) {
      setError(errorMessage(e));
      setStart('');
    } finally {
      setBusy(false);
    }
  }
  async function submit(v: Intent) {
    setBusy(true);
    setError('');
    try {
      const result = await request<Success>(
        manual ? '/api/admin/appointments' : '/api/bookings',
        manual
          ? { action: 'create', booking: v, source: v.manualSource ?? source }
          : v,
      );
      setResult(result);
      setManagement(`${location.origin}/reservation/gestion#${v.token}`);
      sessionStorage.removeItem(storageKey);
      setIntent(null);
      basket.clear();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.code !== 'INVALID_REQUEST') {
        sessionStorage.removeItem(storageKey);
        setIntent(null);
        if (
          ['QUOTE_CHANGED', 'SLOT_UNAVAILABLE', 'SERVICE_UNAVAILABLE'].includes(
            e.code,
          )
        ) {
          setQuote(null);
          setStart('');
          setSlots([]);
          setSearched(false);
        }
      }
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <section>
        <span className="eyebrow">
          {catalog.demo
            ? 'SIMULATION ENREGISTRÉE DANS CE NAVIGATEUR'
            : 'DEMANDE ENREGISTRÉE'}
        </span>
        <h1 style={{ fontSize: 48 }}>
          Votre moment
          <br />
          se prépare.
        </h1>
        <p className="success">
          Référence {result.reference} · En attente de confirmation
        </p>
        <p>
          Le salon doit encore confirmer ce rendez-vous. Aucun message
          automatique n’a été envoyé.
        </p>
        {result.booking && (
          <div className="record">
            <h2>{dateLabel(result.booking.starts_at)}</h2>
            <p>Fin prévue : {timeLabel(result.booking.ends_at)}</p>
            {result.booking.items.map((i) => (
              <p key={i.service_id}>
                {i.name} · {i.duration_minutes} min
              </p>
            ))}
            <p>
              {result.booking.uncertain
                ? 'Montant connu estimé'
                : 'Total estimé'}{' '}
              : {money(result.booking.total_minor)}
              {result.booking.uncertain ? ' + prestations à confirmer' : ''}
            </p>
          </div>
        )}
        <p>
          Conservez ce lien privé pour consulter ou modifier la demande selon la
          politique du salon. Toute personne qui possède ce lien peut accéder au
          rendez-vous.
        </p>
        <div className="private-link">
          <a href={management}>{management}</a>
        </div>
        {catalog.settings?.phone && (
          <p>
            Pour contacter le salon :{' '}
            <a href={`tel:${catalog.settings.phone}`}>
              {catalog.settings.phone}
            </a>
          </p>
        )}
        <Link href="/services" className="button secondary">
          Retour aux prestations
        </Link>
      </section>
    );
  if (activeIntent)
    return (
      <section>
        <h2>Une demande reste à vérifier.</h2>
        <p>
          La réponse a pu être interrompue. Reprenez la même demande pour
          retrouver son résultat sans créer de doublon.
        </p>
        <p>{dateLabel(activeIntent.start)}</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button"
          disabled={busy}
          onClick={() => submit(activeIntent)}
        >
          {busy ? 'Vérification…' : 'Vérifier ma demande'}
        </button>
      </section>
    );
  return (
    <div className="booking-layout">
      {catalog.demo && (
        <p className="notice local-booking-notice" role="status">
          Simulation locale · Utilisez des coordonnées fictives. Aucun
          rendez-vous réel ni message n’est envoyé.
        </p>
      )}
      <ol className="booking-progress" aria-label="Étapes de réservation">
        {['Votre sélection', 'Le créneau', 'Vos coordonnées'].map(
          (label, index) => (
            <li
              key={label}
              aria-current={
                (quote ? 2 : basket.ids.length ? 1 : 0) === index
                  ? 'step'
                  : undefined
              }
            >
              <span aria-hidden>{String(index + 1).padStart(2, '0')}</span>
              {label}
            </li>
          ),
        )}
      </ol>
      <div>
        {!catalog.settings?.booking_enabled && (
          <p className="notice">
            La réservation sera ouverte après validation des prestations, des
            horaires et des politiques par le salon.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!basket.ready ? (
          <p role="status">Chargement de votre sélection…</p>
        ) : !basket.ids.length ? (
          <div className="empty-state">
            <h2>Votre moment commence ici.</h2>
            <p>
              Ajoutez une ou plusieurs prestations pour découvrir les créneaux
              disponibles.
            </p>
            <Link className="button" href="/services">
              Explorer la carte ↗
            </Link>
          </div>
        ) : (
          <>
            {invalid && (
              <p className="error">
                Une prestation n’est plus réservable. Retirez-la avant de
                continuer.
              </p>
            )}
            <section className="form-section">
              <h2>01. Votre créneau</h2>
              <p className="small">Horaires du salon · Africa/Casablanca</p>
              <label>
                Choisir une date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    counter.current++;
                    setDate(e.target.value);
                    setQuote(null);
                    setStart('');
                    setSlots([]);
                    setSearched(false);
                  }}
                  required
                />
              </label>
              <button
                className="button secondary"
                disabled={
                  busy || !date || invalid || !catalog.settings?.booking_enabled
                }
                onClick={loadSlots}
              >
                {busy ? 'Recherche…' : 'Voir les disponibilités'}
              </button>
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.starts_at}
                    className={start === slot.starts_at ? 'selected' : ''}
                    disabled={busy}
                    onClick={() => selectSlot(slot.starts_at)}
                    aria-pressed={start === slot.starts_at}
                  >
                    {timeLabel(slot.starts_at)}
                  </button>
                ))}
              </div>
              {searched && !slots.length && (
                <p>
                  Aucun créneau ne peut accueillir votre sélection ce jour-là.
                  Essayez une autre date.
                </p>
              )}
            </section>
            <form
              onSubmit={form.handleSubmit(async (contact) => {
                if (!quote) return;
                const value: Intent = {
                  services: basket.ids,
                  start,
                  contact,
                  key: crypto.randomUUID(),
                  token: randomToken(),
                  fingerprint: quote.fingerprint,
                  ...(manual ? { manualSource: source } : {}),
                };
                try {
                  sessionStorage.setItem(storageKey, JSON.stringify(value));
                } catch {
                  setError(
                    'Activez le stockage de session pour sécuriser la reprise de votre demande.',
                  );
                  return;
                }
                setIntent(value);
                await submit(value);
              })}
            >
              <fieldset
                disabled={!quote || busy}
                style={{ border: 0, padding: 0, margin: 0 }}
              >
                <section className="form-section">
                  <h2>02. Vos coordonnées</h2>
                  <div className="form-grid">
                    <label>
                      Nom complet
                      <input autoComplete="name" {...form.register('name')} />
                      {form.formState.errors.name && (
                        <span className="error">
                          {form.formState.errors.name.message}
                        </span>
                      )}
                    </label>
                    <label>
                      Téléphone
                      <input
                        type="tel"
                        autoComplete="tel"
                        placeholder="+212…"
                        {...form.register('phone')}
                      />
                      {form.formState.errors.phone && (
                        <span className="error">
                          {form.formState.errors.phone.message}
                        </span>
                      )}
                    </label>
                  </div>
                  <label>
                    E-mail (facultatif)
                    <input
                      type="email"
                      autoComplete="email"
                      {...form.register('email')}
                    />
                    {form.formState.errors.email && (
                      <span className="error">
                        {form.formState.errors.email.message}
                      </span>
                    )}
                  </label>
                  <label>
                    Un détail à nous préciser ? (facultatif)
                    <textarea {...form.register('notes')} />
                  </label>
                  {manual && (
                    <label>
                      Origine de la demande
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                      >
                        <option value="phone">Téléphone</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="instagram">Instagram</option>
                        <option value="walk_in">Sur place</option>
                        <option value="other">Autre</option>
                      </select>
                    </label>
                  )}
                </section>
                <section className="form-section">
                  <h2>03. Relire et envoyer</h2>
                  {quote && (
                    <>
                      <p>
                        {dateLabel(quote.starts_at)} — fin prévue à{' '}
                        {timeLabel(quote.ends_at)} (préparation comprise)
                      </p>
                      {quote.items.map((i) => (
                        <p key={i.service_id}>
                          {i.name} · {i.duration_minutes} min ·{' '}
                          {i.final_minor === null
                            ? 'Sur consultation'
                            : money(i.final_minor)}
                          {i.promotion_name ? ` (${i.promotion_name})` : ''}
                        </p>
                      ))}
                      <p className="notice">
                        {quote.uncertain
                          ? 'Montant connu estimé'
                          : 'Total estimé'}{' '}
                        : {money(quote.total_minor)}
                        {quote.uncertain
                          ? ' — certaines prestations nécessitent une confirmation du prix.'
                          : ''}
                      </p>
                    </>
                  )}
                  <p className="prose small">{catalog.settings?.policy_text}</p>
                  <label className="checkbox-label">
                    <input type="checkbox" {...form.register('consent')} />
                    <span>
                      J’accepte la{' '}
                      <Link
                        className="text-link"
                        href="/confidentialite"
                        target="_blank"
                      >
                        politique de réservation et de confidentialité
                      </Link>
                      .
                    </span>
                  </label>
                  {form.formState.errors.consent && (
                    <p className="error">
                      {form.formState.errors.consent.message}
                    </p>
                  )}
                  <p className="small">
                    Une demande reste en attente jusqu’à l’intervention du
                    salon. Elle ne constitue pas un rendez-vous confirmé.
                  </p>
                  <button className="button" type="submit">
                    {busy ? 'Enregistrement…' : 'Envoyer ma demande ↗'}
                  </button>
                </section>
              </fieldset>
            </form>
          </>
        )}
      </div>
      <aside className="booking-summary">
        <span className="eyebrow">VOTRE MOMENT</span>
        <h2>Ma sélection</h2>
        {basket.ids.map((id) => {
          const s = catalog.services.find((s) => s.id === id);
          const price = s ? currentPrice(s, catalog) : null;
          return (
            <div className="basket-row" key={id}>
              <strong>{s?.name ?? 'Prestation indisponible'}</strong>
              {s && (
                <small>
                  {s.duration_minutes} min ·{' '}
                  {price?.promotion ? (
                    <>
                      <del>{priceLabel(s)}</del> {money(price.amount!)} ·{' '}
                      {price.promotion.name}
                    </>
                  ) : (
                    priceLabel(s)
                  )}
                </small>
              )}
              <button
                className="remove"
                disabled={busy}
                onClick={() => basket.remove(id)}
              >
                Retirer
              </button>
            </div>
          );
        })}
        <div className="total">
          <span>{uncertain ? 'Montant connu estimé' : 'Total estimé'}</span>
          <span>{money(estimate)}</span>
        </div>
        {uncertain && (
          <p className="small">
            Certaines prestations nécessitent une confirmation du prix.
          </p>
        )}
        <div className="total">
          <span>Durée des prestations</span>
          <span>
            {selected.reduce((sum, s) => sum + s.duration_minutes, 0)} min
          </span>
        </div>
        <p className="small">
          Le récapitulatif final inclut les temps de préparation et les offres
          applicables.
        </p>
        <Link className="text-link" href="/services">
          Ajouter une prestation ↗
        </Link>
      </aside>
    </div>
  );
}
