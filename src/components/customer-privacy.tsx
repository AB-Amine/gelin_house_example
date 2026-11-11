'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {api} from '@/lib/client';
import {useI18n} from './locale-provider';
export function CustomerPrivacy({ id }: { id: string }) {
  const{t}=useI18n();
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
        } catch {
          setError('common.error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        {t('admin.privacyNote')}
      </p>
      <label>
        {t('admin.privacyReason')}
        <input name="reason" required minLength={5} maxLength={300} />
      </label>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="inline-actions">
        <button className="button" disabled={busy}>
          {t('admin.anonymize')}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => setOpen(false)}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  ) : (
    <button className="remove" onClick={() => setOpen(true)}>
      {t('admin.anonymize')}
    </button>
  );
}
