'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, errorMessage } from '@/lib/client';
import type { AppointmentRequestRow } from '@/lib/appointment-requests';
export function AppointmentRequestActions({
  request: r,
}: {
  request: AppointmentRequestRow;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(
    !r.preferred_date || !r.preferred_time,
  );
  const [date, setDate] = useState(r.preferred_date ?? '');
  const [time, setTime] = useState(r.preferred_time?.slice(0, 5) ?? '');
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [calendar, setCalendar] = useState('');
  const [setupLink, setSetupLink] = useState<{
    href: string;
    label: string;
  } | null>(null);
  async function send(action: 'confirm' | 'modify' | 'reject') {
    setBusy(true);
    setMessage('');
    setSetupLink(null);
    try {
      const result = await api<{ reference?: string }>(
        '/api/admin/appointment-request',
        {
          id: r.id,
          action,
          ...(action !== 'reject'
            ? { date: date || undefined, time: time || undefined }
            : {}),
        },
      );
      setEditing(false);
      if (action === 'confirm') {
        setMessage('Rendez-vous confirmé et ajouté au calendrier.');
        setCalendar(`/admin/calendar?date=${date}&view=day`);
      } else
        setMessage(
          action === 'reject'
            ? 'Demande refusée.'
            : 'Date souhaitée modifiée. La demande reste en attente.',
        );
      startTransition(() => router.refresh());
      return result;
    } catch (error) {
      setMessage(errorMessage(error));
      if (error instanceof ApiError) {
        if (error.code === 'SALON_CLOSED') setEditing(true);
        if (
          [
            'START_TIME_TAKEN',
            'INVALID_SLOT',
            'SLOT_UNAVAILABLE',
            'OUTSIDE_WINDOW',
          ].includes(error.code)
        ) {
          setEditing(true);
          setMessage(
            'Cette heure de début est déjà réservée ou n’est pas valide. Choisissez une autre heure ou une autre date.',
          );
        }
        if (
          ['REQUEST_DURATION_REQUIRED', 'SERVICE_UNAVAILABLE'].includes(
            error.code,
          )
        )
          setSetupLink({
            href: '/admin/services',
            label: 'Vérifier les prestations et leurs durées',
          });
        else if (
          [
            'REQUEST_SETUP_REQUIRED',
            'REQUEST_LOCATION_REQUIRED',
            'NOT_CONFIGURED',
          ].includes(error.code)
        )
          setSetupLink({
            href: '/admin/settings',
            label: 'Compléter les informations du salon',
          });
        else if (error.code === 'SLOT_UNAVAILABLE')
          setSetupLink({
            href: '/admin/availability',
            label: 'Vérifier les horaires du salon',
          });
      }
    } finally {
      setBusy(false);
    }
  }
  const pending = r.request_status === 'pending';
  return (
    <div className="request-actions">
      <span className="badge">
        {pending
          ? 'En attente'
          : r.request_status === 'rejected'
            ? 'Refusée'
            : 'Rendez-vous créé'}
      </span>
      {r.preferred_date && (
        <p>
          Date souhaitée :{' '}
          <strong>
            {r.preferred_date.split('-').reverse().join('/')}
            {r.preferred_time ? ` à ${r.preferred_time.slice(0, 5)}` : ''}
          </strong>
        </p>
      )}
      {message && (
        <p role="status" className="notice" style={{ whiteSpace: 'pre-line' }}>
          {message}
        </p>
      )}
      {setupLink && (
        <p>
          <Link href={setupLink.href}>{setupLink.label}</Link>
        </p>
      )}
      {(calendar || r.appointment_id) && (
        <Link
          className="button secondary"
          href={
            calendar ||
            (r.appointments
              ? `/admin/bookings?reference=${r.appointments.reference}`
              : `/admin/calendar?date=${r.preferred_date}&view=day`)
          }
        >
          {calendar ? 'Voir le calendrier' : 'Voir le rendez-vous'}
        </Link>
      )}
      {pending && !calendar && (
        <>
          {editing || !date || !time ? (
            <form
              className="admin-form request-date-form"
              onSubmit={(e) => {
                e.preventDefault();
                void send('confirm');
              }}
            >
              <p>
                Vérifiez la date et l’heure. Les coordonnées et prestations sont
                déjà enregistrées.
              </p>
              <div className="form-grid">
                <label>
                  Date
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Heure de début
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="inline-actions">
                <button className="button" disabled={busy || refreshing}>
                  Confirmer le rendez-vous
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || refreshing || !date}
                  onClick={() => void send('modify')}
                >
                  Enregistrer la modification
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || refreshing}
                  onClick={() => void send('reject')}
                >
                  Refuser
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setEditing(false)}
                >
                  Fermer
                </button>
              </div>
            </form>
          ) : (
            <div className="inline-actions">
              <button
                className="button"
                disabled={busy || refreshing}
                onClick={() => void send('confirm')}
              >
                Confirmer
              </button>
              <button
                className="button secondary"
                disabled={busy || refreshing}
                onClick={() => setEditing(true)}
              >
                Modifier
              </button>
              <button
                className="button secondary"
                disabled={busy || refreshing}
                onClick={() => void send('reject')}
              >
                Refuser
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
