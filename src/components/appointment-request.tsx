'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Catalog } from '@/lib/domain';
import { phoneSchema } from '@/lib/domain';
import { businessToday } from '@/lib/dates';
import { api, errorMessage } from '@/lib/client';
import { useBasket } from './basket';
import { useWebsiteCopy } from './website-copy';

export function AppointmentRequest({
  catalog: initial,
  configured,
  initialService = '',
  manual = false,
}: {
  catalog: Catalog;
  configured: boolean;
  initialService?: string;
  manual?: boolean;
}) {
  const { catalog, t } = useWebsiteCopy(initial);
  const basket = useBasket();
  const services = catalog.services.filter(
    (s) => s.published && !s.archived && s.service_type !== 'rental',
  );
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const selected = services
    .filter(
      (s) =>
        choices[s.id] ??
        (basket.ids.includes(s.id) || s.slug === initialService),
    )
    .slice(0, 10);
  const stale = basket.ids.filter((id) => !services.some((s) => s.id === id));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [reference, setReference] = useState('');
  const [savedDate, setSavedDate] = useState('');
  const today = businessToday(
    catalog.settings?.timezone ?? 'Africa/Casablanca',
  );
  if (saved)
    return (
      <section className="fatu-empty" role="status">
        <h2>
          {manual
            ? 'Rendez-vous enregistré dans le calendrier.'
            : t('requestForm.saved')}
        </h2>
        <p>{manual ? reference : t('requestForm.followUp')}</p>
        {manual && (
          <Link
            className="button"
            href={`/admin/calendar?date=${savedDate}&view=day`}
          >
            Voir le calendrier
          </Link>
        )}
        <button className="fatu-button" onClick={() => setSaved(false)}>
          {t('requestForm.another')}
        </button>
      </section>
    );
  return (
    <section className="appointment-request">
      <p className="fatu-intro">
        {manual
          ? 'Renseignez la cliente, les prestations et l’heure de début.'
          : t('requestForm.intro')}
      </p>
      <form
        className="appointment-request-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          if (!selected.length) {
            setError('requestForm.chooseService');
            return;
          }
          const data = new FormData(form);
          const phone = phoneSchema.safeParse(data.get('phone'));
          if (!phone.success) {
            setError('requestForm.phoneError');
            return;
          }
          setBusy(true);
          setError('');
          try {
            const result = await api<{ reference?: string }>(
              manual ? '/api/admin/diary' : '/api/appointment-requests',
              {
                name: data.get('name'),
                email: data.get('email') ?? '',
                phone: phone.data,
                services: selected.map((s) => s.id),
                date: data.get('date'),
                time: data.get('time'),
                notes: data.get('notes') ?? '',
                consent: data.get('consent') === 'on',
                website: data.get('website') ?? '',
                ...(manual ? { key } : {}),
              },
            );
            setReference(result.reference ?? '');
            setSavedDate(String(data.get('date')));
            setKey(crypto.randomUUID());
            form.reset();
            basket.clear();
            setChoices(Object.fromEntries(services.map((s) => [s.id, false])));
            setSaved(true);
          } catch (error) {
            setError(errorMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {!configured && <p className="notice">{t('common.configure')}</p>}
        <fieldset disabled={busy}>
          <h2>1. Vos prestations</h2>
          <label>
            {t('nav.services')}
            <select
              value=""
              required={!selected.length}
              disabled={selected.length >= 10 || !services.length}
              onChange={(e) => {
                if (e.target.value)
                  setChoices((old) => ({ ...old, [e.target.value]: true }));
              }}
            >
              <option value="">{t('requestForm.addService')}</option>
              {catalog.categories.map((c) => {
                const items = services.filter(
                  (s) =>
                    s.category_id === c.id &&
                    !selected.some((item) => item.id === s.id),
                );
                return items.length ? (
                  <optgroup label={c.name} key={c.id}>
                    {items.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
              {services
                .filter(
                  (s) =>
                    !s.category_id &&
                    !selected.some((item) => item.id === s.id),
                )
                .map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="appointment-request-selection" aria-live="polite">
            {selected.map((s) => (
              <div className="basket-row" key={s.id}>
                <span>
                  {s.name}
                  {s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
                  <small className="request-service-price">
                    {s.price_minor === null || s.price_type === 'consultation'
                      ? 'Prix sur demande'
                      : `${s.price_type === 'starting' ? 'À partir de ' : ''}${s.price_minor / 100} ${catalog.settings?.currency ?? 'MAD'}`}
                  </small>
                </span>
                <button
                  type="button"
                  className="fatu-text-link"
                  aria-label={`${t('common.delete')} ${s.name}`}
                  onClick={() =>
                    setChoices((old) => ({ ...old, [s.id]: false }))
                  }
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            {stale.map((id) => (
              <div className="basket-row" key={id}>
                <span>{t('common.unavailable')}</span>
                <button
                  type="button"
                  className="fatu-text-link"
                  onClick={() => basket.remove(id)}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
          </div>
          <h2>2. Date et heure souhaitées</h2>
          <div className="form-grid">
            <label>
              {manual ? 'Date' : t('requestForm.date')}
              <input name="date" type="date" min={today} required />
            </label>
            <label>
              {manual ? 'Heure de début' : 'Heure de début souhaitée'}
              <input name="time" type="time" required />
            </label>
          </div>
          <h2>3. Vos coordonnées</h2>
          <div className="form-grid">
            <label>
              {manual ? 'Nom de la cliente' : t('auth.fullName')}
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label>
              {t('auth.phone')}
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={30}
              />
            </label>
            {!manual && (
              <label>
                Email (facultatif)
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                />
              </label>
            )}
          </div>
          <label>
            {t('requestForm.notes')}
            <textarea name="notes" rows={4} maxLength={500} />
          </label>
          <div hidden aria-hidden>
            <input name="website" tabIndex={-1} autoComplete="off" />
          </div>
          {!manual && (
            <label className="checkbox">
              <input name="consent" type="checkbox" required />
              {t('contact.consent')}
            </label>
          )}
          <button
            className="fatu-button"
            disabled={
              !configured || !services.length || !selected.length || busy
            }
          >
            {busy
              ? t('common.saving')
              : manual
                ? 'Enregistrer le rendez-vous'
                : t('booking.submit')}
          </button>
          <p className="small">
            {manual
              ? 'Agenda par heure de début : vérifiez vous-même le temps nécessaire aux prestations.'
              : 'Votre demande reste en attente jusqu’à la confirmation du salon.'}
          </p>
        </fieldset>
      </form>
    </section>
  );
}
