import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { entities } from '@/lib/admin-config';
import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { FatuEntityManager } from '@/components/fatu-entity-manager';
import { FatuAdminInbox } from '@/components/fatu-admin-inbox';
import { getI18n } from '@/lib/admin-i18n';
import { DailySalonHours } from '@/components/daily-salon-hours';
import { SalonContent } from '@/components/salon-content';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{
    page?: string;
    view?: string;
    new?: string;
    appointment?: string;
  }>;
}) {
  await requirePageStaff();
  const { entity } = await params;
  if (entity === 'staff' || entity === 'qualifications')
    redirect('/admin/availability');
  const p = await searchParams;
  const { t } = await getI18n();
  const db = await sessionDb();
  const page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  const nextHref = (n: number) =>
    `?${new URLSearchParams({ ...(p.view ? { view: p.view } : {}), page: String(n) })}`;
  const inbox = {
    requests: 'change_requests',
    messages: 'contact_messages',
    notifications: 'notification_outbox',
    payments: 'payment_records',
  } as const;
  if (entity in inbox) {
    const section = entity as keyof typeof inbox;
    let inboxQuery = db
      .from(inbox[section])
      .select(
        section === 'messages'
          ? '*,appointments(reference,starts_at,status)'
          : '*,appointments(reference)',
        {
          count: 'exact',
        },
      )
      .order(section === 'payments' ? 'received_at' : 'created_at', {
        ascending: false,
      })
      .range((page - 1) * 50, page * 50 - 1);
    if (section === 'requests' && p.appointment)
      inboxQuery = inboxQuery.eq('appointment_id', p.appointment);
    if (section === 'messages') inboxQuery = inboxQuery.eq('handled', false);
    const { data, error, count } = await inboxQuery;
    if (error)
      return (
        <p className="error">
          Impossible de charger cette rubrique. Réessayez.
        </p>
      );
    const { data: appointments } =
      section === 'payments'
        ? await db
            .from('appointments')
            .select('id,reference,currency')
            .order('starts_at', { ascending: false })
            .limit(200)
        : { data: [] };
    return (
      <>
        <FatuAdminInbox
          section={section}
          rows={(data ?? []) as unknown as Record<string, unknown>[]}
          appointments={appointments ?? []}
        />
        <div className="inline-actions">
          {page > 1 && <Link href={nextHref(page - 1)}>← Précédent</Link>}
          <span>Page {page}</span>
          {page * 50 < (count ?? 0) && (
            <Link href={nextHref(page + 1)}>Suivant →</Link>
          )}
        </div>
      </>
    );
  }
  const config = entities[entity];
  if (!config) notFound();
  if (entity === 'availability') {
    const { data, error } = await db
      .from('working_hours')
      .select('weekday,opens,closes')
      .is('resource_id', null)
      .order('weekday')
      .order('opens');
    if (error)
      return <p className="error">Impossible de charger les horaires.</p>;
    const day = data?.some((h) => h.weekday === 1) ? 1 : data?.[0]?.weekday;
    return (
      <>
        <DailySalonHours
          openDays={[...new Set((data ?? []).map((h) => h.weekday))]}
          initial={(data ?? [])
            .filter((h) => h.weekday === day)
            .map((h) => ({
              opens: h.opens.slice(0, 5),
              closes: h.closes.slice(0, 5),
            }))}
        />
        <SalonContent
          section="hours"
          timezone={
            (await db.from('salon_settings').select('timezone').single()).data
              ?.timezone ?? 'Africa/Casablanca'
          }
        />
      </>
    );
  }
  let query = db.from(config.table).select('*', { count: 'exact' });
  if (entity === 'staff' || entity === 'equipment')
    query = query.eq('kind', entity === 'staff' ? 'staff' : 'equipment');
  if (entity === 'faqs') query = query.like('key', 'faq.%');
  if (['exceptions', 'closures'].includes(entity))
    query = query.is('resource_id', null);
  const {
    data: rows,
    error,
    count,
  } = await query
    .order(config.fields.some((f) => f.key === 'position') ? 'position' : 'id')
    .range((page - 1) * 50, page * 50 - 1);
  const refs: Record<string, Record<string, unknown>[]> = {};
  const tables = new Set(config.fields.flatMap((f) => (f.ref ? [f.ref] : [])));
  if (['promotions', 'offers', 'staff'].includes(entity))
    tables.add('services');
  const relations: [string, string, string][] =
    config.table === 'promotions'
      ? [['promotion_services', 'promotion_id', 'promotion_services']]
      : entity === 'staff'
        ? [
            ['qualifications', 'resource_id', 'qualifications'],
            ['working_hours', 'resource_id', 'working_hours'],
          ]
        : [];
  const loadErrors: boolean[] = [];
  await Promise.all(
    [...tables].map(async (table) => {
      const { data, error, count } = await db
        .from(table)
        .select('id,name', { count: 'exact' })
        .order('name')
        .range(0, 999);
      if (error || (count ?? 0) > 1000) loadErrors.push(true);
      refs[table] = data ?? [];
    }),
  );
  await Promise.all(
    relations.map(async ([table, column, key]) => {
      const ids = (rows ?? []).map((r) => r.id);
      if (!ids.length) {
        refs[key] = [];
        return;
      }
      const { data, error, count } = await db
        .from(table)
        .select('*', { count: 'exact' })
        .in(column, ids)
        .range(0, 9999);
      if (error || (count ?? 0) > 10000) loadErrors.push(true);
      refs[key] = data ?? [];
    }),
  );
  if (entity === 'translations')
    await Promise.all(
      [
        'services',
        'categories',
        'cities',
        'website_content',
        'gallery',
        'reviews',
        'salon_settings',
      ].map(async (table) => {
        const { data, error, count } = await db
          .from(table)
          .select('*', { count: 'exact' })
          .range(0, 999);
        if (error || (count ?? 0) > 1000) loadErrors.push(true);
        refs[`translation_${table}`] = (data ?? []).map((r) => ({
          id:
            table === 'salon_settings'
              ? '00000000-0000-4000-8000-000000000001'
              : r.id,
          name: r.name || r.title || r.alt || 'Texte du site',
        }));
      }),
    );
  const { data: settings } = await db
    .from('salon_settings')
    .select('timezone,currency')
    .single();
  const title =
    entity === 'settings'
      ? p.view === 'website'
        ? 'Site web'
        : p.view === 'advanced'
          ? 'Règles de réservation'
          : 'Mon salon'
      : entity === 'staff'
        ? 'Équipe'
        : entity === 'equipment'
          ? 'Matériel'
          : entity === 'promotions' || entity === 'offers'
            ? 'Offres & Promotions'
            : entity === 'faqs'
              ? 'Questions fréquentes'
              : t(config.title);
  return (
    <>
      <h1>{title}</h1>
      {error || loadErrors.length > 0 ? (
        <p className="error">
          Les informations nécessaires n’ont pas pu être chargées intégralement.
          Réessayez avant de modifier cette configuration.
        </p>
      ) : (
        <>
          <FatuEntityManager
            key={`${entity}-${p.view ?? ''}-${page}`}
            slug={entity}
            rows={rows ?? []}
            refs={refs}
            timezone={settings?.timezone}
            currency={settings?.currency}
            view={p.view}
          />
          {entity === 'settings' && p.view === 'website' && (
            <>
              <SalonContent
                section="website"
                timezone={settings?.timezone ?? 'Africa/Casablanca'}
              />
              <details className="entity-details">
                <summary>Conditions et règles de réservation</summary>
                <FatuEntityManager
                  slug="settings"
                  rows={rows ?? []}
                  refs={{}}
                  view="policies"
                />
              </details>
            </>
          )}
          {entity === 'settings' && p.view === 'advanced' && (
            <details className="entity-details">
              <summary>Outils de dépannage</summary>
              <div className="salon-context">
                {Object.entries({
                  payments: 'Encaissements',
                  equipment: 'Matériel',
                  resources: 'Matériel nécessaire',
                  translations: 'Traductions',
                  notifications: 'Notifications',
                  activity: 'Historique des actions',
                  locations: 'Ancienne configuration des villes',
                }).map(([route, label]) => (
                  <Link key={route} href={`/admin/${route}`}>
                    {label}
                  </Link>
                ))}
              </div>
            </details>
          )}
          {entity !== 'settings' && (
            <div className="inline-actions">
              {page > 1 && <Link href={nextHref(page - 1)}>← Précédent</Link>}
              <span>
                Page {page} · {count ?? 0} éléments
              </span>
              {page * 50 < (count ?? 0) && (
                <Link href={nextHref(page + 1)}>Suivant →</Link>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
