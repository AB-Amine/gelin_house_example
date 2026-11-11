'use client';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { createDemoState, demoCatalog, type DemoState } from './demo-data';
import type { Catalog } from './domain';
const key = 'gelin-local-studio-v1';
const event = 'gelin-local-studio-change';
const empty: DemoState = {
  version: 1,
  entities: {},
  bookings: [],
  activity: [],
};
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(event, callback);
  };
}
function snapshot() {
  try {
    return process.env.NODE_ENV === 'development'
      ? (localStorage.getItem(key) ?? '')
      : '';
  } catch {
    return '';
  }
}
function decode(raw: string, fallback: DemoState): DemoState {
  try {
    const v = JSON.parse(raw);
    return v.version === 1 &&
      v.entities &&
      Object.values(v.entities).every(Array.isArray) &&
      Array.isArray(v.bookings) &&
      Array.isArray(v.activity)
      ? v
      : fallback;
  } catch {
    return fallback;
  }
}
export function getDemoState() {
  if (process.env.NODE_ENV !== 'development')
    throw Error('Le mode local est disponible uniquement en développement.');
  return decode(snapshot(), createDemoState());
}
export function updateDemoState(update: (state: DemoState) => DemoState) {
  const next = update(getDemoState());
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    throw Error(
      'Le stockage local est plein ou désactivé. Retirez une image ou autorisez le stockage de ce site.',
    );
  }
  window.dispatchEvent(new Event(event));
}
export function resetDemoState() {
  localStorage.setItem(key, JSON.stringify(createDemoState()));
  localStorage.setItem('gh-basket', '[]');
  sessionStorage.removeItem('gh-demo-booking-token');
  sessionStorage.removeItem('gh-demo-intent');
  window.dispatchEvent(new Event(event));
  window.dispatchEvent(new Event('gh-basket'));
}
export function useDemoState() {
  const [fallback] = useState(() =>
    process.env.NODE_ENV === 'development' ? createDemoState() : empty,
  );
  const raw = useSyncExternalStore(subscribe, snapshot, () => '');
  return useMemo(() => decode(raw, fallback), [raw, fallback]);
}
export function useLocalCatalog(initial: Catalog) {
  const state = useDemoState();
  return useMemo(
    () =>
      initial.demo && process.env.NODE_ENV === 'development'
        ? demoCatalog(state)
        : initial,
    [initial, state],
  );
}
