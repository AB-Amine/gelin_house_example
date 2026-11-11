import { notFound } from 'next/navigation';
import Link from 'next/link';
import { entities } from '@/lib/admin-config';
import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { ImageUpload } from '@/components/admin';
import { FatuEntityManager } from '@/components/fatu-entity-manager';
import { FatuAdminInbox } from '@/components/fatu-admin-inbox';
import { getI18n } from '@/lib/i18n/server';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePageStaff();
  const { entity } = await params;
  const { t } = await getI18n();
  const db = await sessionDb();
  const page = Math.max(
    1,
    Math.min(10000, Number((await searchParams).page) || 1),
  );
  const inbox = {
    requests: 'change_requests',
    messages: 'contact_messages',
    notifications: 'notification_outbox',
    payments: 'payment_records',
  } as const;
  if (entity in inbox) {
    const section = entity as keyof typeof inbox;
    const { data, error } = await db
      .from(inbox[section])
      .select(section === 'messages' ? '*' : '*,appointments(reference)')
      .order(section === 'payments' ? 'received_at' : 'created_at', {
        ascending: false,
      })
      .range((page - 1) * 50, page * 50 - 1);
    if (error) return <p className="error">{t('common.error')}</p>;
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
        <Link className="text-link" href={`?page=${page + 1}`}>
          {t('common.next')} →
        </Link>
      </>
    );
  }
  const config = entities[entity];
  if (!config) notFound();
  const {
    data: rows,
    error,
    count,
  } = await db
    .from(config.table)
    .select('*', { count: 'exact' })
    .order(config.fields.some((f) => f.key === 'position') ? 'position' : 'id')
    .range((page - 1) * 50, page * 50 - 1);
  const refs: Record<string, Record<string, unknown>[]> = {};
  for (const table of [
    ...new Set(config.fields.flatMap((f) => (f.ref ? [f.ref] : []))),
  ]) {
    const { data } = await db
      .from(table)
      .select(table === 'admin_profiles' ? 'id,display_name' : 'id,name')
      .limit(1000);
    refs[table] = (data ?? []).map((r) => ({
      ...r,
      name: 'display_name' in r ? r.display_name : 'name' in r ? r.name : '',
    }));
  }
  const { data: settings } = await db
    .from('salon_settings')
    .select('timezone')
    .single();
  const titleKey =
    entity === 'settings'
      ? 'admin.settings'
      : entity === 'clients' || entity === 'customers'
        ? 'admin.clients'
        : entity === 'gallery' || entity === 'portfolio'
          ? 'admin.portfolio'
          : entity === 'offers' || entity === 'promotions'
            ? 'admin.promotions'
            : `admin.${entity}`;
  const heading = t(titleKey) === titleKey ? t(config.title) : t(titleKey);
  return (
    <>
      <h1>{heading}</h1>
      {error ? (
        <p className="error">{t('common.error')}</p>
      ) : (
        <>
          {[
            'gallery',
            'portfolio',
            'settings',
            'services',
            'categories',
          ].includes(entity) && <ImageUpload />}
          <FatuEntityManager
            key={entity}
            slug={entity}
            rows={rows ?? []}
            refs={refs}
            timezone={settings?.timezone}
          />
          <div className="inline-actions" style={{ marginTop: 25 }}>
            {page > 1 && (
              <Link className="text-link" href={`?page=${page - 1}`}>
                ← {t('common.back')}
              </Link>
            )}
            <span>
              {page} · {count ?? 0}
            </span>
            {page * 50 < (count ?? 0) && (
              <Link className="text-link" href={`?page=${page + 1}`}>
                {t('common.next')} →
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
