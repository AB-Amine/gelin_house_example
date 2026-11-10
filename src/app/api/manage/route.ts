import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  body,
  failure,
  ok,
  rateLimit,
  sameOrigin,
  tokenHash,
} from '@/lib/http';
import { privileged } from '@/lib/supabase';
import type { ManagedBooking } from '@/lib/domain';
async function current() {
  const token = (await cookies()).get('gh-booking')?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw Error('FORBIDDEN');
  const hash = tokenHash(token);
  const { data, error } = await privileged().rpc('manage_booking', {
    p_token_hash: hash,
  });
  if (error) throw error;
  if (!data) throw Error('NOT_FOUND');
  return { booking: data as ManagedBooking, hash };
}
export async function GET() {
  try {
    return ok((await current()).booking);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await rateLimit(req, 'manage', 20);
    const input = z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('exchange'),
          token: z.string().regex(/^[a-f0-9]{64}$/),
        }),
        z.object({ action: z.literal('cancelled_by_customer') }),
        z.object({
          action: z.literal('reschedule'),
          start: z.iso.datetime({ offset: true }),
        }),
        z.object({ action: z.literal('slots'), date: z.iso.date() }),
      ])
      .parse(await body(req));
    if (input.action === 'exchange') {
      const hash = tokenHash(input.token);
      const { data, error } = await privileged().rpc('manage_booking', {
        p_token_hash: hash,
      });
      if (error || !data) throw Error('FORBIDDEN');
      (await cookies()).set('gh-booking', input.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/manage',
        maxAge: 60 * 60,
      });
      return ok(data);
    }
    const { booking, hash } = await current();
    if (input.action === 'slots') {
      const { data, error } = await privileged().rpc('available_slots', {
        p_services: booking.items.map((i) => i.service_id),
        p_date: input.date,
        p_ignore: booking.id,
      });
      if (error) throw error;
      return ok(data);
    }
    const { error } = await privileged().rpc('change_booking', {
      p_id: booking.id,
      p_action: input.action,
      p_new_start: input.action === 'reschedule' ? input.start : null,
      p_token_hash: hash,
    });
    if (error) throw error;
    return ok({ success: true });
  } catch (e) {
    return failure(e);
  }
}
