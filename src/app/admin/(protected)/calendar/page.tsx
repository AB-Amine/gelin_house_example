import Link from 'next/link';
import { z } from 'zod';
import { sessionDb } from '@/lib/supabase';
import { requirePageStaff } from '@/lib/auth';
import { calendarWindow } from '@/lib/calendar';
import { Calendar, type CalendarEntry } from '@/components/calendar';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    view?: string;
    resource?: string;
    q?: string;
  }>;
}) {
  const staff = await requirePageStaff();
  const p = await searchParams;
  const period = calendarWindow(p.date, p.view);
  const resource = z.uuid().safeParse(p.resource).success ? p.resource! : '';
  const q = (p.q ?? '').slice(0, 80);
  const db = await sessionDb();
  const [
    { data: rows, error },
    { data: resources },
    { data: closures },
    { data: hours },
    { data: exceptions },
  ] = await Promise.all([
    db
      .rpc('search_appointments', {
        p_query: q,
        p_start: period.start,
        p_end: period.end,
        p_resource: resource || null,
      })
      .select(
        'reference,starts_at,ends_at,status,customers(name,phone),appointment_items(name,resource_id,resources(name))',
      )
      .limit(500),
    db.from('resources').select('id,name').eq('kind', 'staff').order('name'),
    db
      .from('closures')
      .select('resource_id,starts_at,ends_at,reason')
      .lt('starts_at', period.end)
      .gt('ends_at', period.start)
      .limit(100),
    db
      .from('working_hours')
      .select('resource_id,weekday,opens,closes')
      .limit(500),
    db
      .from('opening_exceptions')
      .select('resource_id,day,opens,closes')
      .gte('day', period.from)
      .lte('day', period.to)
      .limit(500),
  ]);
  const href = (date: string) =>
    // Keep all filters when navigating between periods.
    `/admin/calendar?${new URLSearchParams({ date, view: period.view, resource, q })}`;
  return (
    <>
      <span className="eyebrow">LE TEMPS DU SALON</span>
      <h1>Le calendrier</h1>
      <form className="admin-toolbar">
        <label>
          Date
          <input name="date" type="date" defaultValue={period.anchor} />
        </label>
        <label>
          Vue
          <select name="view" defaultValue={period.view}>
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
            <option value="list">Liste (30 jours)</option>
          </select>
        </label>
        <label>
          Prestataire
          <select name="resource" defaultValue={resource}>
            <option value="">Tous les prestataires autorisés</option>
            {resources?.map((r) => (
              <option value={r.id} key={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nom, téléphone ou référence
          <input name="q" type="search" defaultValue={q} maxLength={80} />
        </label>
        <button className="button">Afficher</button>
        {staff.role !== 'staff' && (
          <Link className="button secondary" href="/admin/appointments/new">
            + Rendez-vous
          </Link>
        )}
      </form>
      <div className="calendar-navigation">
        <Link className="button secondary" href={href(period.previous)}>
          ← Précédent
        </Link>
        <span>
          {period.from} — {period.to}
        </span>
        <Link className="button secondary" href={href(period.next)}>
          Suivant →
        </Link>
      </div>
      {staff.role === 'staff' && (
        <p className="notice">
          Seuls les rendez-vous attribués à votre ressource sont visibles. La
          propriétaire associe votre compte à votre fiche d’équipe.
        </p>
      )}
      {error ? (
        <p className="error">
          Impossible de charger le calendrier. Vérifiez votre session et
          réessayez.
        </p>
      ) : (
        <Calendar
          window={period}
          rows={(Array.isArray(rows) ? rows : []) as unknown as CalendarEntry[]}
          closures={closures ?? []}
          hours={hours ?? []}
          exceptions={exceptions ?? []}
          resource={resource}
          query={q}
        />
      )}
      <p className="small">
        Heure locale : Africa/Casablanca. Les zones d’indisponibilité indiquent
        les fermetures et absences configurées. Les créneaux de réservation
        vérifient aussi les pauses, ressources et rendez-vous actifs.
      </p>
      {Array.isArray(rows) && rows.length === 500 && (
        <p className="notice">
          500 résultats affichés. Réduisez la période ou filtrez le prestataire.
        </p>
      )}
    </>
  );
}
