'use client';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client';
import { demoRequest } from '@/lib/demo-booking';
import { useLocalCatalog } from '@/lib/demo-store';
import {
  dateLabel,
  emptyCatalog,
  money,
  statusLabels,
  timeLabel,
  type ManagedBooking,
  type Settings,
} from '@/lib/domain';
export function ManageBooking({
  settings: initialSettings,
  demo = false,
}: {
  settings: Settings | null;
  demo?: boolean;
}) {
  const settings = useLocalCatalog({
    ...emptyCatalog,
    settings: initialSettings,
    demo,
  }).settings;
  const request = demo ? demoRequest : api;
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<{ starts_at: string }[]>([]);
  const [start, setStart] = useState('');
  const [cancel, setCancel] = useState(false);
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    async function load() {
      try {
        const token = location.hash.slice(1);
        history.replaceState(null, '', location.pathname);
        setBooking(
          await request<ManagedBooking>(
            '/api/manage',
            token ? { action: 'exchange', token } : undefined,
            token ? 'POST' : 'GET',
          ),
        );
      } catch (e) {
        setError(errorMessage(e));
      }
    }
    void load();
  }, [request]);
  async function change(action: 'reschedule' | 'cancelled_by_customer') {
    if (!booking) return;
    setBusy(true);
    setError('');
    try {
      await request('/api/manage', {
        action,
        id: booking.id,
        ...(action === 'reschedule' ? { start } : {}),
      });
      setBooking(
        await request<ManagedBooking>('/api/manage', undefined, 'GET'),
      );
      setSlots([]);
      setStart('');
      setCancel(false);
      setSearched(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {booking ? (
        <>
          <p className="badge">{statusLabels[booking.status]}</p>
          <h2>{booking.reference}</h2>
          <p>
            {dateLabel(booking.starts_at)} — {timeLabel(booking.ends_at)}
          </p>
          <div className="record">
            {booking.items.map((i) => (
              <p key={i.service_id}>
                {i.name} · {i.duration_minutes} min ·{' '}
                {i.final_minor === null
                  ? 'Sur consultation'
                  : money(i.final_minor)}
              </p>
            ))}
            <p>
              {booking.uncertain ? 'Montant connu estimé' : 'Total estimé'} :{' '}
              {money(booking.total_minor)}
              {booking.uncertain ? ' + prix à confirmer' : ''}
            </p>
          </div>
          {['pending', 'confirmed'].includes(booking.status) && (
            <section style={{ marginTop: 35 }}>
              <h2>Modifier votre rendez-vous</h2>
              <p className="prose small">{settings?.policy_text}</p>
              {settings?.cancellation_enabled &&
                (!cancel ? (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setCancel(true)}
                  >
                    Demander l’annulation
                  </button>
                ) : (
                  <div className="notice">
                    <p>Confirmer l’annulation de ce rendez-vous ?</p>
                    <div className="inline-actions">
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => change('cancelled_by_customer')}
                      >
                        Confirmer l’annulation
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => setCancel(false)}
                      >
                        Conserver
                      </button>
                    </div>
                  </div>
                ))}
              {settings?.rescheduling_enabled && (
                <div className="form-section" style={{ marginTop: 25 }}>
                  <label>
                    Autre date
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setSlots([]);
                        setStart('');
                        setSearched(false);
                      }}
                    />
                  </label>
                  <button
                    className="button secondary"
                    disabled={!date || busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        setSlots(
                          await request('/api/manage', {
                            action: 'slots',
                            id: booking.id,
                            date,
                          }),
                        );
                        setSearched(true);
                      } catch (e) {
                        setError(errorMessage(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Voir les créneaux
                  </button>
                  <div className="slot-grid">
                    {slots.map((s) => (
                      <button
                        key={s.starts_at}
                        className={start === s.starts_at ? 'selected' : ''}
                        onClick={() => setStart(s.starts_at)}
                      >
                        {timeLabel(s.starts_at)}
                      </button>
                    ))}
                  </div>
                  {searched && !slots.length && (
                    <p>Aucun créneau disponible pour cette sélection.</p>
                  )}
                  {start && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => change('reschedule')}
                    >
                      Confirmer le déplacement ↗
                    </button>
                  )}
                  <p className="small">
                    Un déplacement remet la demande en attente de confirmation
                    par le salon.
                  </p>
                </div>
              )}
              {!settings?.cancellation_enabled &&
                !settings?.rescheduling_enabled && (
                  <p>
                    Pour demander une modification, contactez directement le
                    salon.
                  </p>
                )}
            </section>
          )}
          <section style={{ marginTop: 35 }}>
            <h2>Historique</h2>
            {booking.history.map((h, i) => (
              <p className="small" key={i}>
                {dateLabel(h.created_at)} ·{' '}
                {h.action === 'reschedule'
                  ? 'Déplacement'
                  : (statusLabels[h.action as keyof typeof statusLabels] ??
                    h.action)}
              </p>
            ))}
          </section>
        </>
      ) : (
        !error && <p role="status">Chargement de votre rendez-vous…</p>
      )}
      {settings?.phone && (
        <p>
          <a className="text-link" href={`tel:${settings.phone}`}>
            Contacter le salon : {settings.phone}
          </a>
        </p>
      )}
    </>
  );
}
