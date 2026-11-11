'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {api,ApiError} from '@/lib/client';
import {useI18n} from './locale-provider';
export function Team({
  rows,
}: {
  rows: { id: string; display_name: string; role: string; active: boolean }[];
}) {
  const{t}=useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function update(payload: unknown) {
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/team', payload);
      setMessage('common.saved');
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError?`error.${e.code}`:'common.error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p className="error" role="alert">
          {t(error)===error?t('common.error'):t(error)}
        </p>
      )}
      {message && <p className="success">{t(message)}</p>}
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void update({ action: 'invite', ...Object.fromEntries(f.entries()) });
        }}
      >
        <h2>{t('admin.invite')}</h2>
        <p>
          {t('admin.equalAccess')}
        </p>
        <label>
          {t('field.name')}
          <input name="name" required minLength={2} />
        </label>
        <label>
          {t('auth.email')}
          <input type="email" name="email" required />
        </label>
        <button className="button" disabled={busy}>
          {t('admin.invite')}
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
                active: f.get('active') === 'on',
              });
            }}
          >
            <h2>{row.display_name}</h2>
            <p>{t('nav.admin')}</p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={row.active}
              />
              {t('field.active')}
            </label>
            <button className="button secondary" disabled={busy}>
              {t('common.save')}
            </button>
          </form>
        ))}
      </div>
    </>
  );
}
