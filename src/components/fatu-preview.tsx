'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AdminShell } from './admin-shell';
import { FatuAdminDashboard, type AdminSummary } from './fatu-admin-dashboard';
import { FatuEntityManager } from './fatu-entity-manager';
import { Calendar, type CalendarEntry } from './calendar';
import { useI18n } from './locale-provider';
import { entities, entitySchema } from '@/lib/admin-config';
import { calendarWindow } from '@/lib/calendar';
import { Temporal } from '@js-temporal/polyfill';
type Row = Record<string, unknown>;
const storage = 'fatu-admin-preview-v1';
const event = 'fatu-preview-change';
function seed(): Record<string, Row[]> {
  return {
    settings: [
      {
        id: 1,
        name: 'Fatu Makeup Artist',
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
  date,
  view,
}: {
  section: string;
  date?: string;
  view?: string;
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
  const period = calendarWindow(date, view);
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
  };
  const today = Temporal.Now.zonedDateTimeISO('Africa/Casablanca').startOfDay();
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
        from={today.toPlainDate().toString()}
        to={today.add({ days: 30 }).toPlainDate().toString()}
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
  else if (entities[slug])
    content = (
      <>
        <h1>
          {t(`admin.${slug}`) === `admin.${slug}`
            ? t(entities[slug].title)
            : t(`admin.${slug}`)}
        </h1>
        <FatuEntityManager
          key={slug}
          slug={slug}
          rows={data[slug] ?? []}
          refs={refs}
          onSave={async (row) => {
            const parsed = entitySchema(slug).parse(row);
            const id = parsed.id ?? crypto.randomUUID();
            persist({
              ...data,
              [slug]: [
                ...(data[slug] ?? []).filter((r) => r.id !== id),
                { ...parsed, id },
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
      staff={{ display_name: 'Fatu · Preview', role: 'owner' }}
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
