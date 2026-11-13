import { NextRequest } from 'next/server';
import { appointmentRequestSchema } from '@/lib/appointment-requests';
import { privileged } from '@/lib/supabase';
import { body, failure, ok, rateLimit, sameOrigin } from '@/lib/http';
import { businessToday } from '@/lib/dates';
import { clientSession } from '@/lib/client-auth';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await rateLimit(req, 'appointment-request', 5);
    const v = appointmentRequestSchema.parse(await body(req));
    const db = privileged();
    const client = await clientSession();
    const { data: settings, error: settingsError } = await db
      .from('salon_settings')
      .select('timezone')
      .single();
    if (settingsError) throw settingsError;
    if (v.date < businessToday(settings?.timezone ?? 'Africa/Casablanca'))
      throw Error('OUTSIDE_WINDOW');
    const { data: services, error } = await db
      .from('services')
      .select('id,name')
      .in('id', v.services)
      .eq('published', true)
      .eq('archived', false)
      .eq('service_type', 'appointment');
    if (error) throw error;
    if (services?.length !== v.services.length) throw Error('INVALID_SERVICES');
    const message = [
      `Prestations : ${v.services.map((id) => services.find((s) => s.id === id)!.name).join(' ; ')}`,
      `Date souhaitée : ${v.date}`,
      `Heure souhaitée : ${v.time}`,
      ...(v.notes ? [`Précisions : ${v.notes}`] : []),
    ].join('\n');
    const { error: saveError } = await db.from('contact_messages').insert({
      name: v.name,
      phone: v.phone,
      email: v.email,
      subject: 'Demande de rendez-vous',
      message,
      service_ids: v.services,
      preferred_date: v.date,
      preferred_time: v.time,
      client_user_id: client?.user.id ?? null,
    });
    if (saveError) throw saveError;
    return ok({ saved: true, status: 'pending' });
  } catch (error) {
    return failure(error);
  }
}
