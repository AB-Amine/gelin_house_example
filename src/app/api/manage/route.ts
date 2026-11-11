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
import {requireClient} from '@/lib/client-auth';
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
        z.object({ action: z.literal('cancelled_by_customer'), id: z.uuid() }),
        z.object({ action: z.literal('claim'), id: z.uuid() }),
        z.object({
          action: z.literal('reschedule'),
          id: z.uuid(),
          start: z.iso.datetime({ offset: true }),
        }),
        z.object({
          action: z.literal('slots'),
          id: z.uuid(),
          date: z.iso.date(),
        }),
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
    // Another tab may have exchanged a different link into the shared cookie.
    // Never mutate a booking other than the one the user reviewed in this tab.
    if (input.id !== booking.id) throw Error('FORBIDDEN');
    if(input.action==='claim'){
      const{user}=await requireClient();
      const{error}=await privileged().rpc('claim_guest_booking',{p_user:user.id,p_token_hash:hash});
      if(error)throw error;
      return ok({success:true});
    }
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
