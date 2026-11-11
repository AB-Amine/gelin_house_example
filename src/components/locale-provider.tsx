'use client';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { localeTag, translate, type Locale } from '@/lib/i18n/dictionaries';
type I18n = {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  pending: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  money: (amount: number, currency?: string) => string;
  date: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  time: (value: string, timezone?: string) => string;
};
const Context = createContext<I18n | null>(null);
export function LocaleProvider({
  locale: initial,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setOptimistic] = useOptimistic(initial);
  const [pending, startTransition] = useTransition();
  const t = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      translate(locale, key, values),
    [locale],
  );
  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `fatu-language=${next};path=/;max-age=31536000;samesite=lax`;
      startTransition(() => {
        setOptimistic(next);
        document.documentElement.lang = next;
        document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
        router.refresh();
      });
    },
    [router, setOptimistic],
  );
  const value = useMemo<I18n>(
    () => ({
      locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      pending,
      setLocale,
      t,
      money: (amount, currency = 'MAD') =>
        new Intl.NumberFormat(localeTag[locale], {
          style: 'currency',
          currency,
        }).format(amount / 100),
      date: (value, options = {}) =>
        new Intl.DateTimeFormat(localeTag[locale], {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'Africa/Casablanca',
          ...options,
        }).format(new Date(value)),
      time: (value, timezone = 'Africa/Casablanca') =>
        new Intl.DateTimeFormat(localeTag[locale], {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: timezone,
        }).format(new Date(value)),
    }),
    [locale, pending, setLocale, t],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw Error('LocaleProvider is required');
  return value;
}
export function LanguageSwitcher() {
  const { locale, setLocale, t, pending } = useI18n();
  return (
    <div className="fatu-languages" role="group" aria-label={t('nav.language')}>
      {(['fr', 'en', 'ar'] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          disabled={pending}
          onClick={() => setLocale(code)}
          lang={code}
        >
          {code === 'ar' ? 'العربية' : code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
export function L({ text }: { text: string }) {
  return useI18n().t(text);
}
