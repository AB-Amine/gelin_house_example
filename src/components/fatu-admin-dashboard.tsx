'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import { useI18n } from './locale-provider';
import { AppointmentRequestActions } from './appointment-request-actions';
import type { AppointmentRequestRow } from '@/lib/appointment-requests';
import { AdminIcon } from './admin-icon';
type Amount = { currency: string; total_minor: number };
export type AdminSummary = {
  total: number;
  pending: number;
  clients: number;
  completed: number;
  cancelled: number;
  booked_value: Amount[];
  paid: Amount[];
  popular: { name: string; bookings: number }[];
  upcoming: {
    id: string;
    reference: string;
    starts_at: string;
    status: string;
    city_name: string | null;
    name: string;
  }[];
  requests: number;
  messages: number;
  notifications: number;
};
export type AgendaRow = {
  id: string;
  reference: string;
  starts_at: string;
  local_start?: string;
  status: string;
  customers: { name: string } | null;
  appointment_items: { name: string }[];
};
export function FatuAdminDashboard({
  summary: s,
  from,
  timezone,
  dayLabel,
  preview = false,
  today = [],
  confirmed = 0,
  pendingRows = [],
  websiteRequests = [],
  websiteRequestCount = 0,
}: {
  summary: AdminSummary;
  from: string;
  to: string;
  timezone: string;
  dayLabel?: string;
  preview?: boolean;
  today?: AgendaRow[];
  pendingRows?: AgendaRow[];
  confirmed?: number;
  upcomingCount?: number;
  websiteRequests?: AppointmentRequestRow[];
  websiteRequestCount?: number;
}) {
  const { t, date, time } = useI18n();
  const router = useRouter();
  const [action, setAction] = useState<{ id: string; action: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (preview || action || busy) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [preview, action, busy, router]);
  useEffect(() => {
    if (action)
      document
        .getElementById('dashboard-action')
        ?.scrollIntoView({ block: 'center' });
  }, [action]);
  const href = (path: string) => {
    if (!preview) return path;
    const [route, query = ''] = path.split('?');
    return `/admin/preview?section=${route === '/admin' ? 'overview' : route === '/admin/appointments/new' ? 'bookings' : route.split('/')[2]}${query ? `&${query}` : ''}`;
  };
  return (
    <>
      <header className="fatu-admin-heading">
        <div>
          <span className="eyebrow">Votre journée au salon</span>
          <h1>Bonjour, bienvenue au salon</h1>
          <p>Voici l’essentiel de votre journée.</p>
          <p className="salon-today-label">
            <AdminIcon name="bookings" />
            {dayLabel ??
              new Intl.DateTimeFormat('fr-MA', {
                dateStyle: 'full',
                timeZone: 'UTC',
              }).format(new Date(`${from}T12:00:00Z`))}
          </p>
        </div>
        <Link className="button" href={href('/admin/appointments/new')}>
          + Nouveau rendez-vous
        </Link>
      </header>
      <div className="stat-grid salon-stats">
        {[
          ['Demandes en attente', websiteRequestCount, 'hourglass'],
          ['Rendez-vous aujourd’hui', s.total, 'bookings'],
          ['Rendez-vous confirmés à venir', confirmed, 'check'],
        ].map(([label, n, icon]) => (
          <article className="stat-card" key={label}>
            <AdminIcon name={String(icon)} />
            <span>{label}</span>
            <strong>{n}</strong>
          </article>
        ))}
      </div>
      <details className="salon-shortcuts">
        <summary>Prestations et offres : accès rapides</summary>
        <div className="salon-quick-actions" aria-label="Actions rapides">
          <Link href={href('/admin/appointments/new')}>
            Nouveau rendez-vous <span aria-hidden>↗</span>
          </Link>
          <Link href={href('/admin/services?new=1')}>
            Ajouter une prestation <span aria-hidden>↗</span>
          </Link>
          <Link href={href('/admin/promotions?new=1')}>
            Créer une offre <span aria-hidden>↗</span>
          </Link>
        </div>
      </details>
      <div className="salon-dashboard-columns">
        <section
          className="fatu-admin-section"
          aria-label="Demandes de rendez-vous du site"
        >
          <div className="section-heading">
            <h2>Demandes à traiter</h2>
            <div className="inline-actions">
              {!preview && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => router.refresh()}
                >
                  Actualiser
                </button>
              )}
              <Link href={href('/admin/messages')} prefetch={false}>
                Voir toutes les demandes
              </Link>
            </div>
          </div>
          {websiteRequests.some(
            (request) => request.request_status === 'pending',
          ) ? (
            websiteRequests
              .filter((request) => request.request_status === 'pending')
              .slice(0, 4)
              .map((request) => (
                <article
                  className="salon-pending website-request-card"
                  key={request.id}
                >
                  <strong>{request.name}</strong>
                  <p
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {request.message
                      .split('\n')
                      .filter(
                        (line) =>
                          !line.startsWith('Date souhaitée :') &&
                          !line.startsWith('Heure souhaitée :'),
                      )
                      .join('\n')}
                  </p>
                  <p>
                    <a href={`tel:${request.phone}`}>{request.phone}</a>
                    {request.email ? ` · ${request.email}` : ''}
                  </p>
                  <small>
                    Reçue le {date(request.created_at, { timeZone: timezone })}
                  </small>
                  {!preview && <AppointmentRequestActions request={request} />}
                </article>
              ))
          ) : (
            <p className="empty-state">Aucune demande reçue depuis le site.</p>
          )}
        </section>
        <section className="fatu-admin-section">
          <div className="section-heading">
            <h2>Aujourd’hui</h2>
            <Link href={href(`/admin/bookings?period=today`)}>Tout voir →</Link>
          </div>
          {today.length ? (
            <div className="salon-agenda">
              {today.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={href(`/admin/bookings?reference=${b.reference}`)}
                >
                  <time>
                    {b.local_start?.slice(11, 16) ??
                      time(b.starts_at, timezone)}
                  </time>
                  <div>
                    <strong>{b.customers?.name || 'Cliente'}</strong>
                    <small>
                      {b.appointment_items.map((i) => i.name).join(' · ')}
                    </small>
                  </div>
                  <span className={`badge status-${b.status}`}>
                    {t(`status.${b.status}`)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">Aucun rendez-vous aujourd’hui.</p>
          )}
          <Link
            className="salon-calendar-link"
            href={href(`/admin/calendar?date=${from}&view=day`)}
          >
            Voir le calendrier →
          </Link>
        </section>
      </div>
      <details className="salon-disclosure">
        <summary>Autres rendez-vous à confirmer · {pendingRows.length}</summary>
        <section className="fatu-admin-section">
          <div className="section-heading">
            <h2>À confirmer</h2>
            <Link href={href('/admin/bookings?period=pending')}>
              Tout voir →
            </Link>
          </div>
          {pendingRows.length ? (
            pendingRows.map((b) => (
              <article className="salon-pending" key={b.id}>
                <strong>{b.customers?.name || 'Cliente'}</strong>
                <p>
                  {b.local_start?.replace('T', ' à ') ??
                    date(b.starts_at, { timeZone: timezone })}{' '}
                  · {b.appointment_items.map((i) => i.name).join(' · ')}
                </p>
                <div className="inline-actions">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setAction({ id: b.id, action: 'confirmed' })}
                  >
                    Confirmer
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setAction({ id: b.id, action: 'rejected' })}
                  >
                    Refuser
                  </button>
                  <Link href={href(`/admin/bookings?reference=${b.reference}`)}>
                    Voir les détails
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-state">Aucune demande en attente.</p>
          )}
        </section>
      </details>
      {action && (
        <form
          id="dashboard-action"
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const reason = new FormData(e.currentTarget).get('reason') ?? '';
            setBusy(true);
            setMessage('');
            try {
              await api('/api/admin/appointments', { ...action, reason });
              setAction(null);
              router.refresh();
            } catch (error) {
              setMessage(
                error instanceof ApiError
                  ? t(`error.${error.code}`)
                  : 'Impossible de modifier ce rendez-vous.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>
            {action.action === 'confirmed'
              ? 'Confirmer ce rendez-vous ?'
              : 'Refuser ce rendez-vous ?'}
          </h2>
          {action.action === 'rejected' && (
            <label>
              Motif du refus
              <textarea name="reason" required maxLength={2000} />
            </label>
          )}
          <div className="inline-actions">
            <button className="button" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Valider'}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Annuler
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      <details className="salon-disclosure">
        <summary>Suivi et historique du salon</summary>
        <section className="fatu-admin-section">
          <h2>À suivre</h2>
          <div className="salon-context">
            <Link href={href('/admin/requests')}>
              {s.requests} demande(s) de modification
            </Link>
            <Link href={href('/admin/messages')}>
              {s.messages} message(s) à traiter
            </Link>
            <Link href={href('/admin/notifications')}>
              {s.notifications} notification(s) en attente d’envoi
            </Link>
          </div>
          {s.notifications > 0 && (
            <p className="small">
              Les notifications enregistrées ne sont pas envoyées
              automatiquement. Contactez les clientes avec vos canaux habituels.
            </p>
          )}
        </section>
      </details>
    </>
  );
}
