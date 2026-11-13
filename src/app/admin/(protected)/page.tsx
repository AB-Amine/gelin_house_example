import { Temporal } from '@js-temporal/polyfill';
import { sessionDb } from '@/lib/supabase';
import { requirePageStaff } from '@/lib/auth';
import type { AppointmentRequestRow } from '@/lib/appointment-requests';
import {
  FatuAdminDashboard,
  type AgendaRow,
} from '@/components/fatu-admin-dashboard';
export default async function Page() {
  await requirePageStaff();
  const db = await sessionDb();
  const { data: settings } = await db
    .from('salon_settings')
    .select('timezone')
    .single();
  const timezone = settings?.timezone ?? 'Africa/Casablanca';
  const today = Temporal.Now.plainDateISO(timezone);
  const start = today
    .toZonedDateTime({ timeZone: timezone, plainTime: '00:00' })
    .toInstant()
    .toString();
  const end = today
    .add({ days: 1 })
    .toZonedDateTime({ timeZone: timezone, plainTime: '00:00' })
    .toInstant()
    .toString();
  const now = Temporal.Now.instant().toString();
  const [
    summary,
    agenda,
    pending,
    confirmed,
    upcoming,
    websiteRequests,
    websitePending,
  ] = await Promise.all([
    db.rpc('fatu_admin_summary', { p_start: start, p_end: end }),
    db.rpc('fatu_search_bookings', { p_from: start, p_to: end, p_page: 1 }),
    db.rpc('fatu_search_bookings', { p_status: 'pending', p_page: 1 }),
    db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('starts_at', now),
    db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed'])
      .gte('starts_at', now),
    db
      .from('contact_messages')
      .select(
        'id,name,phone,email,message,created_at,handled,service_ids,preferred_date,preferred_time,request_status,appointment_id,appointments(reference,starts_at,status)',
      )
      .eq('subject', 'Demande de rendez-vous')
      .order('created_at', { ascending: false })
      .limit(6),
    db
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('subject', 'Demande de rendez-vous')
      .eq('request_status', 'pending'),
  ]);
  if (
    [
      summary,
      agenda,
      pending,
      confirmed,
      upcoming,
      websiteRequests,
      websitePending,
    ].some((r) => r.error)
  )
    return (
      <p className="error">
        Impossible de charger le tableau de bord. Réessayez.
      </p>
    );
  return (
    <FatuAdminDashboard
      summary={summary.data}
      from={today.toString()}
      to={today.toString()}
      timezone={timezone}
      dayLabel={new Intl.DateTimeFormat('fr-MA', {
        dateStyle: 'full',
        timeZone: 'UTC',
      }).format(new Date(`${today.toString()}T12:00:00Z`))}
      today={
        (agenda.data?.rows ?? []).slice(0, 12).map((row: AgendaRow) => ({
          ...row,
          local_start: Temporal.Instant.from(row.starts_at)
            .toZonedDateTimeISO(timezone)
            .toPlainDateTime()
            .toString()
            .slice(0, 16),
        })) as AgendaRow[]
      }
      pendingRows={
        (pending.data?.rows ?? []).slice(0, 6).map((row: AgendaRow) => ({
          ...row,
          local_start: Temporal.Instant.from(row.starts_at)
            .toZonedDateTimeISO(timezone)
            .toPlainDateTime()
            .toString()
            .slice(0, 16),
        })) as AgendaRow[]
      }
      confirmed={confirmed.count ?? 0}
      upcomingCount={upcoming.count ?? 0}
      websiteRequests={
        (websiteRequests.data ?? []) as unknown as AppointmentRequestRow[]
      }
      websiteRequestCount={websitePending.count ?? 0}
    />
  );
}
