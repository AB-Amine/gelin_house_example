import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const configSchema = z.object({ url: z.url(), key: z.string().min(10) });
export function publicConfig() {
  const c = configSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return c.success ? c.data : null;
}
export function privileged() {
  const cfg = publicConfig();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!cfg || !key) throw Error('NOT_CONFIGURED');
  return createClient(cfg.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function publicDb() {
  const cfg = publicConfig();
  if (!cfg) return null;
  return createClient(cfg.url, cfg.key, {
    global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})},
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function sessionDb() {
  const cfg = publicConfig();
  if (!cfg) throw Error('NOT_CONFIGURED');
  const jar = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            }),
          );
        } catch {
          /* Server Components cannot write cookies; proxy refreshes them. */
        }
      },
    },
  });
}
