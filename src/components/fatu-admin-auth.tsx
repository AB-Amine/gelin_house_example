'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import { useI18n } from './locale-provider';
export function FatuAdminAuth({
  configured,
  mode = 'login',
}: {
  configured: boolean;
  mode?: 'login' | 'reset' | 'password';
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <form
      className="fatu-profile-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
          await api(
            `/api/auth/${mode}`,
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          if (mode === 'login') {
            router.replace('/admin');
            router.refresh();
          } else
            setMessage(
              mode === 'reset' ? 'auth.resetSent' : 'auth.passwordSaved',
            );
        } catch {
          setMessage('auth.invalid');
        } finally {
          setBusy(false);
        }
      }}
    >
      {!configured && (
        <p className="notice">
          {t('common.configure')}
          {process.env.NODE_ENV === 'development' && (
            <Link className="fatu-text-link" href="/admin/preview">
              {t('admin.preview')} ↗
            </Link>
          )}
        </p>
      )}
      {mode !== 'password' && (
        <label>
          {t('auth.email')}
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
      {mode !== 'reset' && (
        <label>
          {t('auth.password')}
          <input
            name="password"
            type="password"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            minLength={mode === 'login' ? 1 : 12}
            maxLength={128}
            required
          />
        </label>
      )}
      {message && <p role="status">{t(message)}</p>}
      <button className="fatu-button" disabled={busy || !configured}>
        {t(
          busy
            ? 'common.loading'
            : mode === 'login'
              ? 'auth.login'
              : mode === 'reset'
                ? 'auth.reset'
                : 'common.save',
        )}
      </button>
      {mode === 'login' && (
        <Link className="fatu-text-link" href="/admin/reset">
          {t('auth.forgot')}
        </Link>
      )}
    </form>
  );
}
