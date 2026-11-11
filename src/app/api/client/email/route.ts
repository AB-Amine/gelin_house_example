import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireClient } from '@/lib/client-auth';
import { body, failure, ok, sameOrigin, rateLimit } from '@/lib/http';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { db } = await requireClient();
    await rateLimit(req, 'client-email', 5);
    const v = z.object({ email: z.email().max(254) }).parse(await body(req));
    const app = new URL(process.env.APP_URL ?? 'http://127.0.0.1:3000').origin;
    const { error } = await db.auth.updateUser(
      { email: v.email },
      { emailRedirectTo: `${app}/auth/callback?next=/client/profile` },
    );
    if (error) throw error;
    return ok({ message: 'auth.emailPending' });
  } catch (e) {
    return failure(e);
  }
}
