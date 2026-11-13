import 'server-only';
import { cache } from 'react';
import { publicDb } from './supabase';
import { emptyCatalog, type Catalog } from './domain';
export const getCatalog = cache(
  async (): Promise<{ catalog: Catalog; unavailable: boolean }> => {
    const as_of = Date.now();
    const db = publicDb();
    if (!db) return { catalog: { ...emptyCatalog, as_of }, unavailable: true };
    try {
      const { data, error } = await db.rpc('fatu_catalog');
      if (error) throw error;
      const catalog = data as Catalog;
      const localDate = (value: string) =>
        new Intl.DateTimeFormat('en-CA', {
          timeZone: catalog.settings?.timezone || 'Africa/Casablanca',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(value));
      const localTime = (value: string) =>
        new Intl.DateTimeFormat('fr-FR', {
          timeZone: catalog.settings?.timezone || 'Africa/Casablanca',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date(value));
      return {
        catalog: {
          ...catalog,
          as_of,
          promotions: catalog.promotions
            .filter((p) => p.active && Date.parse(p.ends_at) > as_of)
            .sort(
              (a, b) =>
                Number(Date.parse(a.starts_at) > as_of) -
                  Number(Date.parse(b.starts_at) > as_of) ||
                Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
                a.id.localeCompare(b.id),
            )
            .map((p) => ({
              ...p,
              starts_on: localDate(p.starts_at),
              ends_on: localDate(p.ends_at),
              starts_time: localTime(p.starts_at),
              ends_time: localTime(p.ends_at),
            })),
        },
        unavailable: false,
      };
    } catch {
      return { catalog: { ...emptyCatalog, as_of }, unavailable: true };
    }
  },
);
