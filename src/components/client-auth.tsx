'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from './locale-provider';
import { api, ApiError } from '@/lib/client';
export function ClientAuthForm({
  mode = 'login',
  configured,
}: {
  mode?: 'login' | 'register' | 'reset' | 'password';
  configured: boolean;
}) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const title =
    mode === 'register'
      ? 'auth.register'
      : mode === 'reset'
        ? 'auth.reset'
        : mode === 'password'
          ? 'auth.newPassword'
          : 'auth.login';
  return (
    <section className="fatu-auth">
      <span className="fatu-eyebrow">{t('nav.client')}</span>
      <h1 className="fatu-title">{t(title)}</h1>
      <p className="fatu-copy">{t('client.private')}</p>
      {!configured && <p className="notice">{t('common.configure')}</p>}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {t(message)}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const data = Object.fromEntries(
              new FormData(e.currentTarget).entries(),
            );
            const result = await api<{
              message?: string;
              authenticated?: boolean;
            }>(`/api/client/auth/${mode}`, { ...data, locale });
            if (mode === 'login' || result.authenticated) {
              router.replace('/client');
              router.refresh();
            } else setMessage(result.message ?? 'auth.verify');
          } catch (ex) {
            setError(
              ex instanceof ApiError && ex.code === 'AUTH_FAILED'
                ? 'auth.invalid'
                : ex instanceof ApiError && ex.code === 'RATE_LIMIT'
                  ? 'error.RATE_LIMIT'
                  : ex instanceof ApiError && ex.code === 'NOT_CONFIGURED'
                    ? 'common.configure'
                    : 'common.error',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === 'register' && (
          <label>
            {t('auth.fullName')}
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
        )}
        {mode !== 'password' && (
          <label>
            {t('auth.email')}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
        )}
        {mode === 'register' && (
          <label>
            {t('auth.phone')}
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={30}
            />
          </label>
        )}
        {mode !== 'reset' && (
          <label>
            {t(mode === 'password' ? 'auth.newPassword' : 'auth.password')}
            <input
              name="password"
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              required
              minLength={mode === 'login' ? 1 : 12}
              maxLength={128}
            />
            {mode !== 'login' && <small>{t('auth.strongPassword')}</small>}
          </label>
        )}
        <button className="fatu-button" disabled={busy || !configured}>
          {t(busy ? 'common.loading' : title)} <span aria-hidden>↗</span>
        </button>
      </form>
      <div className="fatu-auth-links">
        {mode === 'login' ? (
          <>
            <Link href="/client/register">
              {t('auth.noAccount')} {t('auth.register')}
            </Link>
            <Link href="/client/reset">{t('auth.forgot')}</Link>
          </>
        ) : (
          <Link href="/client/login">
            {t('auth.haveAccount')} {t('auth.login')}
          </Link>
        )}
      </div>
    </section>
  );
}
