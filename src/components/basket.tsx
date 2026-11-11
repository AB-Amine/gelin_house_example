'use client';
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {useI18n} from './locale-provider';
type Basket = {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  ready: boolean;
};
const Context = createContext<Basket | null>(null);
let fallback = '[]';
const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('gh-basket', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('gh-basket', callback);
  };
};
function snapshot() {
  try {
    return localStorage.getItem('gh-basket') ?? fallback;
  } catch {
    return fallback;
  }
}
function decode(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value))
      return [
        ...new Set(
          value.filter(
            (v: unknown): v is string =>
              typeof v === 'string' && /^[a-f0-9-]{36}$/i.test(v),
          ),
        ),
      ].slice(0, 10);
  } catch {}
  return [];
}
export function BasketProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => 'pending');
  const ids = useMemo(() => (raw === 'pending' ? [] : decode(raw)), [raw]);
  function update(next: string[]) {
    fallback = JSON.stringify(next);
    try {
      localStorage.setItem('gh-basket', fallback);
    } catch {}
    window.dispatchEvent(new Event('gh-basket'));
  }
  return (
    <Context.Provider
      value={{
        ids,
        ready: raw !== 'pending',
        add: (id) => update(ids.includes(id) ? ids : [...ids, id].slice(0, 10)),
        remove: (id) => update(ids.filter((x) => x !== id)),
        clear: () => update([]),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useBasket() {
  const value = useContext(Context);
  if (!value) throw Error('Missing basket provider');
  return value;
}
export function BasketLink() {
  const{t}=useI18n();
  const { ids } = useBasket();
  return (
    <Link
      className={`basket-link ${ids.length ? 'has-items' : 'is-empty'}`}
      href="/reservation"
    >
      {t('basket.title')}{' '}
      <span>{ids.length}</span>
    </Link>
  );
}
export function AddService({
  id,
  disabled = false,
}: {
  id: string;
  disabled?: boolean;
}) {
  const { ids, add, remove } = useBasket();
  const{t}=useI18n();
  const selected = ids.includes(id);
  return (
    <button
      className={selected ? 'button secondary' : 'button'}
      disabled={disabled || (!selected && ids.length >= 10)}
      onClick={() => (selected ? remove(id) : add(id))}
      aria-pressed={selected}
    >
      {disabled
        ? t('common.unavailable')
        : selected
          ? t('services.selected')
          : t('services.choose')}
      <span aria-hidden> {selected ? '−' : '+'}</span>
    </button>
  );
}
