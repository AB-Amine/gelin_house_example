'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
export function CustomerPrivacy({ id }: { id: string }) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return open ? (
    <form
      className="notice"
      onSubmit={async (e) => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          await api('/api/admin/privacy', { id, reason: values.get('reason') });
          setOpen(false);
          router.refresh();
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Après vérification de l’identité et de la demande, cette action efface
        les coordonnées et les notes, puis révoque les liens privés.
        L’historique des prestations reste conservé. Les rendez-vous actifs
        doivent d’abord être résolus.
      </p>
      <label>
        Référence interne de la demande (sans données personnelles)
        <input name="reason" required minLength={5} maxLength={300} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="inline-actions">
        <button className="button" disabled={busy}>
          Confirmer l’anonymisation
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => setOpen(false)}
        >
          Conserver
        </button>
      </div>
    </form>
  ) : (
    <button className="remove" onClick={() => setOpen(true)}>
      Traiter une demande d’effacement
    </button>
  );
}
