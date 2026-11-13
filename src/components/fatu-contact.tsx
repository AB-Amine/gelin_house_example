'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Catalog } from '@/lib/domain';
import { api } from '@/lib/client';
import { useWebsiteCopy } from './website-copy';
import { FatuHeading } from './fatu-pages';
export function FatuContact({
  catalog: initial,
  configured,
}: {
  catalog: Catalog;
  configured: boolean;
}) {
  const { t, catalog } = useWebsiteCopy(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const s = catalog.settings;
  return (
    <div className="fatu-container">
      <FatuHeading title="nav.contact" body="premium.simpleBooking" />
      <div className="fatu-contact-grid fatu-section">
        <aside>
          <span className="fatu-eyebrow">{s?.name || 'GELIN HOUSE'}</span>
          <h2>{t('footer.connect')}</h2>
          <p>{s?.address || t('contact.pending')}</p>
          {s?.phone && (
            <a className="fatu-text-link" href={`tel:${s.phone}`}>
              {s.phone}
            </a>
          )}
          {s?.email && (
            <a className="fatu-text-link" href={`mailto:${s.email}`}>
              {s.email}
            </a>
          )}
          {s?.whatsapp && (
            <a
              className="fatu-button"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`}
            >
              WhatsApp ↗
            </a>
          )}
          {s?.instagram && (
            <a
              className="fatu-text-link"
              href={s.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram ↗
            </a>
          )}
          <p className="fatu-fine">{t('common.notConfirmed')}</p>
          <Link className="fatu-button" href="/reservation">
            {t('nav.booking')} ↗
          </Link>
          {s?.map_url && (
            <a
              className="fatu-text-link"
              href={s.map_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('premium.map')} ↗
            </a>
          )}
          <h3>Horaires d’ouverture</h3>
          {[
            'Lundi',
            'Mardi',
            'Mercredi',
            'Jeudi',
            'Vendredi',
            'Samedi',
            'Dimanche',
          ].map((name, i) => {
            const day = (i + 1) % 7;
            const periods = catalog.hours.filter((h) => h.weekday === day);
            return (
              <p key={day}>
                {name} :{' '}
                {periods.length
                  ? periods
                      .map(
                        (h) => `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}`,
                      )
                      .join(' / ')
                  : 'Fermé'}
              </p>
            );
          })}
        </aside>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            setMessage('');
            try {
              const data = Object.fromEntries(new FormData(form));
              await api('/api/contact', {
                ...data,
                consent: data.consent === 'on',
              });
              setMessage('contact.saved');
              form.reset();
            } catch {
              setMessage('common.error');
            } finally {
              setBusy(false);
            }
          }}
        >
          {!configured && <p className="notice">{t('common.configure')}</p>}
          {message && (
            <p
              role="status"
              className={message === 'contact.saved' ? 'success' : 'error'}
            >
              {t(message)}
            </p>
          )}
          {[
            ['name', 'auth.fullName', 'text'],
            ['email', 'auth.email', 'email'],
            ['phone', 'auth.phone', 'tel'],
            ['subject', 'contact.subject', 'text'],
          ].map(([key, label, type]) => (
            <label key={key}>
              {t(label)}
              <input
                name={key}
                type={type}
                required={key !== 'phone'}
                maxLength={
                  key === 'name'
                    ? 120
                    : key === 'email'
                      ? 254
                      : key === 'phone'
                        ? 30
                        : 200
                }
                minLength={key === 'name' || key === 'subject' ? 2 : undefined}
              />
            </label>
          ))}
          <label>
            {t('contact.message')}
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={4000}
              rows={6}
            />
          </label>
          <div hidden aria-hidden>
            <input name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <label className="checkbox">
            <input name="consent" type="checkbox" required />
            {t('contact.consent')}
          </label>
          <button className="fatu-button" disabled={busy || !configured}>
            {t(busy ? 'common.saving' : 'contact.send')} ↗
          </button>
        </form>
      </div>
    </div>
  );
}
