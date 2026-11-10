import Link from 'next/link';
import { z } from 'zod';
import { requirePageStaff } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase';
import { statuses, statusLabels } from '@/lib/domain';
import { dateRange } from '@/lib/dates';
import { AppointmentList, type AppointmentRow } from '@/components/admin';
export default async function Appointments({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
    customer?: string;
    reference?: string;
    page?: string;
  }>;
}) {
  const staff = await requirePageStaff();
  const p = await searchParams;
  const range = dateRange(p.from, p.to);
  const page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  let query = (await sessionDb())
    .from('appointments')
    .select(
      'id,reference,starts_at,ends_at,status,total_minor,uncertain,source,notes,internal_notes,created_at,customers(name,phone,email),appointment_items(name,duration_minutes,sequence,price_type,original_minor,discount_minor,final_minor,promotion_name,starts_at,ends_at,resources(name))',
      { count: 'exact' },
    )
    .order('starts_at');
  if (p.reference && /^GH-[A-F0-9]+$/.test(p.reference))
    query = query.eq('reference', p.reference);
  else if (p.customer && z.uuid().safeParse(p.customer).success)
    query = query.eq('customer_id', p.customer);
  else query = query.gte('starts_at', range.start).lt('starts_at', range.end);
  if (statuses.includes(p.status as (typeof statuses)[number]))
    query = query.eq('status', p.status);
  const { data, error, count } = await query.range(
    (page - 1) * 50,
    page * 50 - 1,
  );
  const qs = new URLSearchParams({ ...p, page: String(page + 1) });
  return (
    <>
      <h1>Les rendez-vous</h1>
      <form className="admin-toolbar">
        <label>
          Du
          <input type="date" name="from" defaultValue={range.from} />
        </label>
        <label>
          Au
          <input type="date" name="to" defaultValue={range.to} />
        </label>
        <label>
          Statut
          <select name="status" defaultValue={p.status ?? ''}>
            <option value="">Tous</option>
            {statuses.map((s) => (
              <option value={s} key={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </label>
        {p.customer && (
          <input type="hidden" name="customer" value={p.customer} />
        )}
        {p.reference && (
          <input type="hidden" name="reference" value={p.reference} />
        )}
        <button className="button">Filtrer</button>
        {staff.role !== 'staff' && (
          <Link className="button secondary" href="/admin/appointments/new">
            + Rendez-vous manuel
          </Link>
        )}
      </form>
      {error ? (
        <p className="error">Impossible de charger les rendez-vous.</p>
      ) : (
        <AppointmentList
          rows={(data ?? []) as unknown as AppointmentRow[]}
          role={staff.role}
        />
      )}
      <div className="inline-actions" style={{ marginTop: 25 }}>
        {page > 1 && (
          <Link
            className="text-link"
            href={`?${new URLSearchParams({ ...p, page: String(page - 1) })}`}
          >
            ← Précédent
          </Link>
        )}
        <span className="small">
          Page {page} · {count ?? 0} rendez-vous
        </span>
        {page * 50 < (count ?? 0) && (
          <Link className="text-link" href={`?${qs}`}>
            Suivant →
          </Link>
        )}
      </div>
    </>
  );
}
