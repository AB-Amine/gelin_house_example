import 'server-only';
import { cache } from 'react';
import { publicDb } from './supabase';
import { emptyCatalog, type Catalog } from './domain';
export const getCatalog = cache(
  async (): Promise<{ catalog: Catalog; unavailable: boolean }> => {
    const db = publicDb();
    if (!db) return { catalog: emptyCatalog, unavailable: true };
    try {
      const { data, error } = await db.rpc('public_catalog');
      if (error) throw error;
      return { catalog: data as Catalog, unavailable: false };
    } catch {
      return { catalog: emptyCatalog, unavailable: true };
    }
  },
);
