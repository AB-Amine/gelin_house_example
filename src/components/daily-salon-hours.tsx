'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, errorMessage } from '@/lib/client';
import Link from 'next/link';
type Hours = { opens: string; closes: string };
export function DailySalonHours({
  initial,
  openDays,
  onSave,
}: {
  initial: Hours[];
  openDays: number[];
  onSave?: (hours: Hours[], days: number[]) => Promise<void>;
}) {
  const router = useRouter();
  const [hours, setHours] = useState<Hours[]>(
    initial.length ? initial : [{ opens: '', closes: '' }],
  );
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(openDays);
  const [message, setMessage] = useState('');
  const [affected, setAffected] = useState<{ reference: string }[]>([]);
  return (
    <>
      <h1>Horaires du salon</h1>
      <p>
        Choisissez les jours d’ouverture. Les mêmes heures s’appliquent aux
        jours cochés.
      </p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {affected.length > 0 && (
        <p className="notice">
          Rendez-vous à vérifier avant de modifier les horaires :{' '}
          {affected.map((a) => (
            <Link
              key={a.reference}
              href={`/admin/bookings?reference=${encodeURIComponent(a.reference)}`}
            >
              {a.reference}{' '}
            </Link>
          ))}
        </p>
      )}
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage('');
          setAffected([]);
          try {
            if (onSave) await onSave(hours, days);
            else await api('/api/admin/daily-hours', { hours, days });
            setMessage(
              onSave
                ? 'Horaires enregistrés dans cet aperçu uniquement.'
                : 'Jours et horaires enregistrés.',
            );
            if (!onSave) router.refresh();
          } catch (error) {
            setMessage(errorMessage(error));
            setAffected(error instanceof ApiError ? error.affected : []);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="salon-weekdays">
            {[
              'Lundi',
              'Mardi',
              'Mercredi',
              'Jeudi',
              'Vendredi',
              'Samedi',
              'Dimanche',
            ].map((label, i) => {
              const day = (i + 1) % 7;
              return (
                <label className="checkbox-label" key={day}>
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={(e) =>
                      setDays((old) =>
                        e.target.checked
                          ? [...old, day]
                          : old.filter((d) => d !== day),
                      )
                    }
                  />
                  {label}
                </label>
              );
            })}
          </div>
          {hours.map((h, i) => (
            <div className="form-grid" key={i}>
              <label>
                Ouverture
                <input
                  type="time"
                  required
                  value={h.opens}
                  onChange={(e) =>
                    setHours((old) =>
                      old.map((row, j) =>
                        j === i ? { ...row, opens: e.target.value } : row,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Fermeture
                <input
                  type="time"
                  required
                  value={h.closes}
                  onChange={(e) =>
                    setHours((old) =>
                      old.map((row, j) =>
                        j === i ? { ...row, closes: e.target.value } : row,
                      ),
                    )
                  }
                />
              </label>
              {hours.length > 1 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setHours((old) => old.filter((_, j) => j !== i))
                  }
                >
                  Retirer cette plage
                </button>
              )}
            </div>
          ))}
          <div className="inline-actions">
            <button className="button" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer les horaires'}
            </button>
            {hours.length < 10 && (
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setHours((old) => [...old, { opens: '', closes: '' }])
                }
              >
                Ajouter une plage horaire
              </button>
            )}
          </div>
        </fieldset>
      </form>
      <p>
        Les confirmations respectent ces horaires, les exceptions et les
        fermetures. Aucun rendez-vous existant n’est annulé automatiquement.
      </p>
    </>
  );
}
