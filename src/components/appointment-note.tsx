'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {api} from '@/lib/client';
import {useI18n} from './locale-provider';
export function AppointmentNote({
  id,
  initial,
}: {
  id: string;
  initial: string;
}) {
  const{t}=useI18n();
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
        } catch {
          setError('common.error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {t('field.notes')}
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
        {t('common.save')}
      </button>
      {saved && (
        <p className="success" role="status">
          {t('common.saved')}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </form>
  );
}
