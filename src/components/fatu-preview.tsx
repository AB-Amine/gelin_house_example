'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AdminShell } from './admin-shell';
import { FatuAdminDashboard, type AdminSummary } from './fatu-admin-dashboard';
import { FatuEntityManager } from './fatu-entity-manager';
import { Calendar, type CalendarEntry } from './calendar';
import { useI18n } from './locale-provider';
import { entities, entitySchema } from '@/lib/admin-config';
import type { calendarWindow } from '@/lib/calendar';
import { Temporal } from '@js-temporal/polyfill';
import { DailySalonHours } from './daily-salon-hours';
import { FatuAdminAuth } from './fatu-admin-auth';
import { FatuClients } from './fatu-clients';
type Row = Record<string, unknown>;
const storage = 'fatu-admin-preview-v1';
const event = 'fatu-preview-change';
function seed(): Record<string, Row[]> {
  return {
    settings: [
      {
        id: 1,
        name: 'GELIN HOUSE',
        timezone: 'Africa/Casablanca',
        currency: 'MAD',
        approved: false,
        booking_enabled: false,
        brand_color: '#B89B72',
        instagram: 'https://www.instagram.com/fatu_makeupartist/',
        notice_minutes: 120,
        horizon_days: 60,
        increment_minutes: 15,
        cancellation_notice_hours: 24,
        rescheduling_notice_hours: 24,
        no_show_grace_minutes: 30,
      },
    ],
    services: [],
    categories: [],
    gallery: [],
    offers: [],
    content: [],
    locations: [],
    staff: [],
    customers: [],
    activity: [],
  };
}
function subscribe(callback: () => void) {
  window.addEventListener(event, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(event, callback);
    window.removeEventListener('storage', callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(storage) ?? '';
  } catch {
    return '';
  }
}
export function FatuPreview({
  section,
  view,
  today,
  dayLabel,
  period,
}: {
  section: string;
  view?: string;
  today: string;
  dayLabel: string;
  period: ReturnType<typeof calendarWindow>;
}) {
  const { t } = useI18n();
  const [fallback] = useState(seed);
  const raw = useSyncExternalStore(subscribe, snapshot, () => '');
  let data = fallback;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Object.values(parsed).every(Array.isArray)
    )
      data = parsed;
  } catch {}
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const aliases: Record<string, string> = {
    portfolio: 'gallery',
    promotions: 'offers',
    clients: 'customers',
    bookings: 'appointments',
  };
  const slug = aliases[section] ?? section;
  function persist(next: Record<string, Row[]>) {
    localStorage.setItem(storage, JSON.stringify(next));
    window.dispatchEvent(new Event(event));
  }
  const refs: Record<string, Row[]> = {
    categories: data.categories ?? [],
    services: data.services ?? [],
    resources: data.staff ?? [],
    promotions: data.offers ?? [],
    cities: data.locations ?? [],
    promotion_services: data.promotion_services ?? [],
    qualifications: data.qualifications ?? [],
    working_hours: data.working_hours ?? [],
  };
  const summary: AdminSummary = {
    total: 0,
    pending: 0,
    clients: 0,
    completed: 0,
    cancelled: 0,
    booked_value: [],
    paid: [],
    popular: [],
    upcoming: [],
    requests: 0,
    messages: 0,
    notifications: 0,
  };
  let content: React.ReactNode;
  if (slug === 'overview')
    content = (
      <FatuAdminDashboard
        preview
        summary={summary}
        from={today}
        to={Temporal.PlainDate.from(today).add({ days: 30 }).toString()}
        dayLabel={dayLabel}
        timezone="Africa/Casablanca"
      />
    );
  else if (slug === 'calendar')
    content = (
      <>
        <h1>{t('admin.calendar')}</h1>
        <form className="admin-toolbar">
          <input type="hidden" name="section" value="calendar" />
          <label>
            {t('field.day')}
            <input name="date" type="date" defaultValue={period.anchor} />
          </label>
          <label>
            {t('calendar.view')}
            <select name="view" defaultValue={period.view}>
              {['day', 'week', 'month', 'list'].map((v) => (
                <option key={v} value={v}>
                  {t(`calendar.${v}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="button">{t('common.filter')}</button>
        </form>
        <div className="calendar-navigation">
          <Link
            href={`/admin/preview?section=calendar&date=${period.previous}&view=${period.view}`}
          >
            ← {t('common.back')}
          </Link>
          <span>
            {period.from} — {period.to}
          </span>
          <Link
            href={`/admin/preview?section=calendar&date=${period.next}&view=${period.view}`}
          >
            {t('common.next')} →
          </Link>
        </div>
        <Calendar
          preview
          window={period}
          rows={[] as CalendarEntry[]}
          closures={[]}
          hours={[]}
          exceptions={[]}
          resource=""
          query=""
        />
      </>
    );
  else if (section === 'clients')
    content = (
      <FatuClients
        rows={[]}
        query=""
        page={1}
        count={0}
        timezone="Africa/Casablanca"
      />
    );
  else if (section === 'account')
    content = (
      <>
        <h1>Mon compte</h1>
        <h2>Changer mon mot de passe</h2>
        <FatuAdminAuth configured={false} mode="password" />
        <details>
          <summary>Accès administrateurs</summary>
          <p>Les accès se gèrent dans l’espace connecté.</p>
        </details>
      </>
    );
  else if (section === 'availability')
    content = (
      <>
        <DailySalonHours
          key={JSON.stringify(data.working_hours ?? [])}
          initial={(data.working_hours ?? [])
            .filter(
              (h) => h.weekday === (data.working_hours?.[0]?.weekday ?? 1),
            )
            .map((h) => ({ opens: String(h.opens), closes: String(h.closes) }))}
          openDays={[
            ...new Set(
              (data.working_hours ?? []).map((h) => Number(h.weekday)),
            ),
          ]}
          onSave={async (hours, days) =>
            persist({
              ...data,
              working_hours: days.flatMap((weekday) =>
                hours.map((h) => ({
                  ...h,
                  weekday,
                  resource_id: null,
                  id: crypto.randomUUID(),
                })),
              ),
            })
          }
        />
        {['exceptions', 'closures'].map((slug) => (
          <section key={slug}>
            <h2>
              {slug === 'exceptions'
                ? 'Horaires exceptionnels'
                : 'Congés et fermetures'}
            </h2>
            <FatuEntityManager
              slug={slug}
              rows={data[slug] ?? []}
              refs={{}}
              onSave={async (row) =>
                persist({
                  ...data,
                  [slug]: [
                    ...(data[slug] ?? []).filter((r) => r.id !== row.id),
                    { ...row, id: row.id ?? crypto.randomUUID() },
                  ],
                })
              }
              onRemove={async (id) =>
                persist({
                  ...data,
                  [slug]: (data[slug] ?? []).filter((r) => r.id !== id),
                })
              }
            />
          </section>
        ))}
      </>
    );
  else if (entities[slug])
    content = (
      <>
        <h1>
          {slug === 'staff'
            ? 'Équipe'
            : slug === 'settings'
              ? view === 'website'
                ? 'Site web'
                : 'Mon salon'
              : slug === 'offers'
                ? 'Offres & Promotions'
                : slug === 'gallery'
                  ? 'Galerie'
                  : t(entities[slug].title)}
        </h1>
        <FatuEntityManager
          key={`${slug}-${view ?? ''}`}
          slug={slug}
          rows={(data[slug] ?? []).filter(
            (r) => slug !== 'faqs' || String(r.key).startsWith('faq.'),
          )}
          view={view}
          currency={String(data.settings?.[0]?.currency ?? 'MAD')}
          refs={refs}
          onSave={async (row, related) => {
            const parsed = (
              slug === 'settings'
                ? entitySchema(slug).partial()
                : entitySchema(slug)
            ).parse(row);
            const id = parsed.id ?? crypto.randomUUID();
            persist({
              ...data,
              ...((slug === 'offers' || slug === 'staff') && related
                ? {
                    [slug === 'offers'
                      ? 'promotion_services'
                      : 'qualifications']: [
                      ...(
                        data[
                          slug === 'offers'
                            ? 'promotion_services'
                            : 'qualifications'
                        ] ?? []
                      ).filter(
                        (r) =>
                          r[
                            slug === 'offers' ? 'promotion_id' : 'resource_id'
                          ] !== id,
                      ),
                      ...related.services.map((service_id) => ({
                        id: crypto.randomUUID(),
                        [slug === 'offers' ? 'promotion_id' : 'resource_id']:
                          id,
                        service_id,
                      })),
                    ],
                    ...(slug === 'staff'
                      ? {
                          working_hours: [
                            ...(data.working_hours ?? []).filter(
                              (h) => h.resource_id !== id,
                            ),
                            ...related.hours.map((h) => ({
                              ...h,
                              id: crypto.randomUUID(),
                              resource_id: id,
                            })),
                          ],
                        }
                      : {}),
                  }
                : {}),
              [slug]: [
                ...(data[slug] ?? []).filter((r) => r.id !== id),
                {
                  ...(data[slug] ?? []).find((r) => r.id === id),
                  ...parsed,
                  id,
                },
              ],
            });
          }}
          onRemove={async (id) =>
            persist({
              ...data,
              [slug]: (data[slug] ?? []).filter((r) => r.id !== id),
            })
          }
        />
        {slug === 'settings' && view === 'website' && (
          <>
            {['faqs', 'reviews', 'content'].map((panel) => (
              <section className="fatu-admin-section" key={panel}>
                <h2>
                  {panel === 'faqs'
                    ? 'Questions fréquentes'
                    : panel === 'reviews'
                      ? 'Avis clients'
                      : 'Autres textes du site'}
                </h2>
                <FatuEntityManager
                  slug={panel}
                  rows={data[panel] ?? []}
                  refs={{}}
                  onSave={async (row) =>
                    persist({
                      ...data,
                      [panel]: [
                        ...(data[panel] ?? []).filter((r) => r.id !== row.id),
                        { ...row, id: row.id ?? crypto.randomUUID() },
                      ],
                    })
                  }
                />
              </section>
            ))}
            <details className="entity-details">
              <summary>Conditions et règles de réservation</summary>
              <FatuEntityManager
                slug="settings"
                rows={data.settings ?? []}
                refs={{}}
                view="policies"
                onSave={async (row) =>
                  persist({
                    ...data,
                    settings: [{ ...data.settings?.[0], ...row }],
                  })
                }
              />
            </details>
          </>
        )}
      </>
    );
  else
    content = (
      <>
        <h1>
          {t(`admin.${slug}`) === `admin.${slug}`
            ? t('nav.admin')
            : t(`admin.${slug}`)}
        </h1>
        <p className="notice">{t('common.configure')}</p>
        <p>{t('admin.previewNote')}</p>
        <Link className="button" href="/admin/login">
          {t('auth.login')} ↗
        </Link>
      </>
    );
  return (
    <AdminShell
      preview
      staff={{ display_name: 'Aperçu du salon', role: 'owner' }}
    >
      <div className="studio-local-tools">
        <span>{t('admin.previewNote')}</span>
        <button className="text-link" onClick={() => setConfirmReset(true)}>
          {t('admin.resetPreview')}
        </button>
      </div>
      {confirmReset && (
        <div className="notice">
          <p>{t('admin.resetPreviewConfirm')}</p>
          <button
            onClick={() => {
              persist(seed());
              setConfirmReset(false);
              setMessage('admin.previewReset');
            }}
          >
            {t('common.confirm')}
          </button>
          <button onClick={() => setConfirmReset(false)}>
            {t('common.cancel')}
          </button>
        </div>
      )}
      {message && <p role="status">{t(message)}</p>}
      {content}
    </AdminShell>
  );
}
