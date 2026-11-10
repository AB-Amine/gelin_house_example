import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sessionDb } from '@/lib/supabase';
import { requirePageStaff } from '@/lib/auth';
import { money, dateLabel, statusLabels, type Status } from '@/lib/domain';
import { dateRange } from '@/lib/dates';
type Stats = {
  count: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  estimated_minor: number;
  completed_minor: number;
  uncertain_count: number;
  today: number;
  today_minor: number;
  week: number;
  month: number;
  popular: { name: string; bookings: number }[];
  sources: { source: string; bookings: number }[];
};
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const staff = await requirePageStaff();
  if (staff.role === 'staff') redirect('/admin/calendar');
  const params = await searchParams;
  const range = dateRange(params.from, params.to);
  const db = await sessionDb();
  const [{ data: stats, error }, { data: settings }, { count: pending }] =
    await Promise.all([
      db.rpc('admin_stats', { p_start: range.start, p_end: range.end }),
      db.from('salon_settings').select('approved,booking_enabled').single(),
      db
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);
  const s = stats as Stats | null;
  const { data: upcoming } = await db
    .from('appointments')
    .select(
      'reference,starts_at,status,customers(name),appointment_items(name)',
    )
    .gte('ends_at', new Date().toISOString())
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .order('starts_at')
    .limit(6);
  return (
    <>
      <span className="eyebrow">LE QUOTIDIEN DU SALON</span>
      <h1>
        Bonjour,
        <br />
        place à votre journée.
      </h1>
      {!settings?.booking_enabled && (
        <p className="notice">
          La réservation en ligne est fermée. Complétez l’équipe, les
          qualifications, les horaires, les prestations et les politiques, puis
          ouvrez-la dans les réglages.
        </p>
      )}
      <div className="inline-actions">
        {[
          ['Nouveau rendez-vous', '/admin/appointments/new'],
          ['Planning du jour', '/admin/calendar'],
          [
            `Demandes en attente (${pending ?? 0})`,
            '/admin/appointments?status=pending',
          ],
          ['Créer une prestation', '/admin/services'],
          ['Publier une offre', '/admin/offers'],
          ['Bloquer une période', '/admin/closures'],
          ['Modifier les horaires', '/admin/availability'],
        ].map(([label, href]) => (
          <Link className="button secondary" href={href} key={href}>
            {label}
          </Link>
        ))}
      </div>
      <section style={{ marginTop: 35 }}>
        <h2>Les prochaines arrivées</h2>
        {upcoming?.length ? (
          <div className="record-list">
            {upcoming.map((a) => (
              <Link
                className="record"
                key={a.reference}
                href={`/admin/appointments?reference=${a.reference}`}
              >
                <span className="badge">
                  {statusLabels[a.status as Status]}
                </span>
                <h3 style={{ marginTop: 12 }}>
                  {(a.customers as unknown as { name: string } | null)?.name} ·{' '}
                  {dateLabel(a.starts_at)}
                </h3>
                <p>
                  {a.appointment_items
                    .map((i: { name: string }) => i.name)
                    .join(' · ')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p>Aucune prochaine arrivée.</p>
        )}
      </section>
      <form className="admin-toolbar" style={{ marginTop: 35 }}>
        <label>
          Du
          <input type="date" name="from" defaultValue={range.from} />
        </label>
        <label>
          Au
          <input type="date" name="to" defaultValue={range.to} />
        </label>
        <button className="button">Actualiser</button>
      </form>
      {error || !s ? (
        <p className="error">Les statistiques ne sont pas disponibles.</p>
      ) : (
        <>
          <div className="stats">
            {[
              [s.today, 'Rendez-vous aujourd’hui'],
              [
                money(s.today_minor),
                'Valeur prévue aujourd’hui (prix à confirmer inclus)',
              ],
              [s.week, 'Cette semaine'],
              [s.month, 'Ce mois-ci'],
              [s.pending, 'En attente sur la période'],
              [s.confirmed, 'Confirmés / en cours / terminés sur la période'],
              [s.cancelled, 'Annulés sur la période'],
              [s.completed, 'Terminés sur la période'],
              [
                s.count
                  ? `${Math.round((s.confirmed / s.count) * 100)} %`
                  : '—',
                'Taux de confirmation',
              ],
              [
                s.count
                  ? `${Math.round((s.cancelled / s.count) * 100)} %`
                  : '—',
                'Taux d’annulation',
              ],
              [money(s.estimated_minor), 'Valeur estimée des demandes actives'],
              [money(s.completed_minor), 'Valeur des prestations terminées'],
            ].map(([value, label]) => (
              <div className="stat" key={String(label)}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="small">
            Les valeurs proviennent des montants figés à la réservation.{' '}
            {s.uncertain_count} rendez-vous comportent des prix à confirmer.
            Aucun encaissement n’est suivi ; ces valeurs ne représentent pas un
            chiffre d’affaires encaissé.
          </p>
          <div className="contact-grid">
            <section>
              <h2>Prestations les plus demandées</h2>
              {s.popular.length ? (
                s.popular.map((p) => (
                  <div className="hours-row" key={p.name}>
                    <span>{p.name}</span>
                    <span>{p.bookings}</span>
                  </div>
                ))
              ) : (
                <p>Aucune donnée sur cette période.</p>
              )}
            </section>
            <section>
              <h2>Origine des rendez-vous</h2>
              {s.sources.map((p) => (
                <div className="hours-row" key={p.source}>
                  <span>{p.source}</span>
                  <span>{p.bookings}</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </>
  );
}
