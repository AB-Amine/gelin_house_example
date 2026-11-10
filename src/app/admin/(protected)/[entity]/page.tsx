import { notFound } from 'next/navigation';
import { entities } from '@/lib/admin-config';
import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { EntityManager, ImageUpload } from '@/components/admin';
import Link from 'next/link';
export default async function EntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { entity } = await params;
  const config = entities[entity];
  if (!config) notFound();
  const staff = await requirePageStaff(true);
  if (config.owner && staff.role !== 'owner') notFound();
  const db = await sessionDb();
  const page = Math.max(
    1,
    Math.min(10000, Number((await searchParams).page) || 1),
  );
  const {
    data: rows,
    error,
    count,
  } = await db
    .from(config.table)
    .select('*', { count: 'exact' })
    .order(
      config.table === 'salon_settings'
        ? 'id'
        : config.fields.some((f) => f.key === 'position')
          ? 'position'
          : 'id',
    )
    .range((page - 1) * 50, page * 50 - 1);
  const refs: Record<string, Record<string, unknown>[]> = {};
  for (const table of [
    ...new Set(config.fields.flatMap((f) => (f.ref ? [f.ref] : []))),
  ]) {
    const { data } = await db
      .from(table)
      .select(table === 'admin_profiles' ? 'id,display_name' : 'id,name')
      .order(table === 'admin_profiles' ? 'display_name' : 'name')
      .limit(1000);
    refs[table] = (data ?? []).map((row) => ({
      ...row,
      name:
        'display_name' in row
          ? row.display_name
          : 'name' in row
            ? row.name
            : '',
    }));
  }
  return (
    <>
      <h1>{config.title}</h1>
      {error ? (
        <p className="error">
          Impossible de charger les données. Réessayez ou vérifiez votre
          session.
        </p>
      ) : (
        <>
          {['gallery', 'settings', 'services', 'categories'].includes(entity) &&
            staff.role !== 'staff' && <ImageUpload />}
          <EntityManager
            slug={entity}
            rows={rows ?? []}
            refs={refs}
            canEdit={staff.role !== 'staff'}
            owner={staff.role === 'owner'}
          />
          <div className="inline-actions" style={{ marginTop: 25 }}>
            {page > 1 && (
              <Link className="text-link" href={`?page=${page - 1}`}>
                ← Précédent
              </Link>
            )}
            <span className="small">
              Page {page} · {count ?? 0} éléments
            </span>
            {page * 50 < (count ?? 0) && (
              <Link className="text-link" href={`?page=${page + 1}`}>
                Suivant →
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
