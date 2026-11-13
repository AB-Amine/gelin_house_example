'use client';
import Link from 'next/link';
import { useI18n } from './locale-provider';
export type ClientRecord = {
  id: string;
  kind: 'account';
  name: string;
  phone: string;
  email: string;
  created_at: string;
  bookings: number;
};
export function FatuClients({
  rows,
  query,
  page,
  count,
  timezone,
}: {
  rows: ClientRecord[];
  query: string;
  page: number;
  count: number;
  timezone: string;
}) {
  const { date } = useI18n();
  return (
    <>
      <h1>Clientes inscrites</h1>
      <form className="admin-toolbar">
        <label>
          Rechercher une cliente
          <input
            name="q"
            type="search"
            maxLength={100}
            defaultValue={query}
            placeholder="Nom, email ou téléphone"
          />
        </label>
        <button className="button">Rechercher</button>
      </form>
      <div className="registered-clients">
        {rows.map((c) => (
          <article className="registered-client" key={c.id}>
            <div>
              <h2>{c.name || 'Cliente inscrite'}</h2>
              <p>{c.email}</p>
              {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
            </div>
            <div>
              <p>
                Inscrite le{' '}
                {date(c.created_at, {
                  timeZone: timezone,
                  dateStyle: 'medium',
                })}
              </p>
              <p>
                {c.bookings} rendez-vous lié{c.bookings > 1 ? 's' : ''}
              </p>
            </div>
            <details>
              <summary>Voir le profil et l’historique</summary>
              <p>{c.name}</p>
              <p>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </p>
              {c.phone && (
                <p>
                  <a href={`tel:${c.phone}`}>{c.phone}</a>
                </p>
              )}
              <Link
                className="button secondary"
                href={`/admin/bookings?client=${c.id}`}
              >
                Voir les rendez-vous
              </Link>
            </details>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="empty-state">
          {query
            ? 'Aucune cliente inscrite ne correspond à cette recherche.'
            : 'Aucune cliente inscrite pour le moment. Les clientes sans compte restent accessibles dans leurs rendez-vous.'}
        </p>
      )}
      {count > 50 && (
        <div className="inline-actions">
          {page > 1 && (
            <Link href={`?q=${encodeURIComponent(query)}&page=${page - 1}`}>
              ← Précédent
            </Link>
          )}
          <span>Page {page}</span>
          {page * 50 < count && (
            <Link href={`?q=${encodeURIComponent(query)}&page=${page + 1}`}>
              Suivant →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
