'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
export function Team({
  rows,
}: {
  rows: { id: string; display_name: string; role: string; active: boolean }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function update(payload: unknown) {
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/team', payload);
      setMessage(
        'Accès mis à jour. Une invitation nécessite une livraison e-mail configurée dans Supabase.',
      );
      router.refresh();
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
      {message && <p className="success">{message}</p>}
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void update({ action: 'invite', ...Object.fromEntries(f.entries()) });
        }}
      >
        <h2>Inviter un membre</h2>
        <label>
          Nom
          <input name="name" required minLength={2} />
        </label>
        <label>
          E-mail
          <input type="email" name="email" required />
        </label>
        <label>
          Rôle
          <select name="role">
            <option value="staff">Personnel</option>
            <option value="manager">Responsable</option>
          </select>
        </label>
        <button className="button" disabled={busy}>
          Créer l’invitation
        </button>
      </form>
      <div className="record-list">
        {rows.map((row) => (
          <form
            className="record"
            key={row.id}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void update({
                action: 'update',
                id: row.id,
                role: f.get('role'),
                active: f.get('active') === 'on',
              });
            }}
          >
            <h2>{row.display_name}</h2>
            <label>
              Rôle
              <select name="role" defaultValue={row.role}>
                <option value="owner">Propriétaire</option>
                <option value="manager">Responsable</option>
                <option value="staff">Personnel</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={row.active}
              />
              Accès actif
            </label>
            <button className="button secondary" disabled={busy}>
              Enregistrer les droits
            </button>
          </form>
        ))}
      </div>
    </>
  );
}
