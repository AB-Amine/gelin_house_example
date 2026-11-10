import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { dateLabel } from '@/lib/domain';
import Link from 'next/link';
export default async function Activity({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePageStaff(true);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { data, error, count } = await (
    await sessionDb()
  )
    .from('audit_logs')
    .select('id,action,entity,entity_id,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  return (
    <>
      <h1>L’activité du salon</h1>
      {error ? (
        <p className="error">L’historique n’est pas disponible.</p>
      ) : (
        <div className="record-list">
          {data?.map((log) => (
            <article className="record" key={log.id}>
              <p>
                {dateLabel(log.created_at)} · {log.action} · {log.entity}
              </p>
              <small>{log.entity_id}</small>
            </article>
          ))}
          {!data?.length && (
            <p className="empty-state">Aucune modification enregistrée.</p>
          )}
        </div>
      )}
      <div className="inline-actions" style={{ marginTop: 25 }}>
        {page > 1 && (
          <Link className="text-link" href={`?page=${page - 1}`}>
            ← Précédent
          </Link>
        )}
        {page * 50 < (count ?? 0) && (
          <Link className="text-link" href={`?page=${page + 1}`}>
            Suivant →
          </Link>
        )}
      </div>
    </>
  );
}
