import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { privileged } from '@/lib/supabase';
import { body, failure, ok, sameOrigin } from '@/lib/http';
const schema = z.object({
  id: z.uuid(),
  action: z.enum(['confirm', 'modify', 'reject']),
  date: z.iso.date().optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  services: z.array(z.uuid()).min(1).max(10).optional(),
});
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const staff = await requireStaff();
    const v = schema.parse(await body(req));
    const { data, error } = await privileged().rpc(
      'resolve_appointment_request',
      {
        p_id: v.id,
        p_action: v.action,
        p_actor: staff.id,
        p_date: v.date ?? null,
        p_time: v.time ?? null,
        p_services: v.services ?? null,
      },
    );
    if (error) throw error;
    return ok(data);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'message' in error &&
      String(error.message).includes('REQUEST_SETUP_REQUIRED')
    ) {
      const db = privileged();
      const settings = await db
        .from('salon_settings')
        .select(
          'approved,booking_enabled,address,phone,privacy_text,policy_text',
        )
        .single();
      if (!settings.error && settings.data) {
        const s = settings.data;
        const missing = [
          ...((s.address ?? '').trim().length < 5
            ? ['l’adresse du salon (Mon salon → Informations)']
            : []),
          ...(!s.phone
            ? ['le téléphone du salon (Mon salon → Informations)']
            : []),
          ...(!s.privacy_text || !s.policy_text
            ? [
                'les textes de confidentialité et de réservation (Mon salon → Site web → Conditions et règles de réservation)',
              ]
            : []),
          ...(!s.approved || !s.booking_enabled
            ? [
                'la validation des informations et l’ouverture des réservations (Mon salon → Site web → Conditions et règles de réservation)',
              ]
            : []),
        ];
        return NextResponse.json(
          {
            code: 'REQUEST_SETUP_REQUIRED',
            error: `Avant de confirmer, complétez :\n${missing.map((item) => `• ${item}`).join('\n')}\nLa demande reste en attente.`,
          },
          { status: 409, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }
    return failure(error);
  }
}
