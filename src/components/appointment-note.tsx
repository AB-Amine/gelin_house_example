'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
export function AppointmentNote({
  id,
  initial,
}: {
  id: string;
  initial: string;
}) {
  const [note, setNote] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await api('/api/admin/appointments', { action: 'note', id, note });
          setSaved(true);
          router.refresh();
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Note interne du salon
        <textarea
          value={note}
          maxLength={5000}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button className="button secondary" disabled={busy}>
        Enregistrer la note
      </button>
      {saved && (
        <p className="success" role="status">
          Note enregistrée.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
