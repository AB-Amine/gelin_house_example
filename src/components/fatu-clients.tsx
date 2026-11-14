'use client';
import Link from 'next/link';
import { useI18n } from './locale-provider';
import { useState } from 'react';
import { AdminIcon } from './admin-icon';
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
  const [selected, setSelected] = useState('');
  const profile = rows.find((row) => row.id === selected) ?? rows[0];
  return (
    <>
      <h1>Clientes inscrites</h1>
      <p className="salon-page-intro">
        Uniquement les clientes qui possèdent un compte Mon espace.
      </p>
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
        <span className="badge">
          {count} compte{count > 1 ? 's' : ''}
        </span>
      </form>
      <div className="salon-client-layout">
        <div className="registered-clients">
          {rows.map((c) => (
            <article
              className={`registered-client${profile?.id === c.id ? ' is-selected' : ''}`}
              key={c.id}
            >
              <span className="salon-client-avatar" aria-hidden>
                {(c.name || c.email).charAt(0).toUpperCase()}
              </span>
              <div>
                <h2>{c.name || 'Cliente inscrite'}</h2>
                <p>{c.email}</p>
                {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
              </div>
              <div>
                <span className="badge">Compte Mon espace</span>
              </div>
              <button
                className="salon-profile-button"
                aria-pressed={profile?.id === c.id}
                onClick={() => setSelected(c.id)}
              >
                Voir le profil →
              </button>
            </article>
          ))}
        </div>
        {profile && (
          <aside className="salon-client-profile" aria-label="Profil cliente">
            <h2>Profil cliente</h2>
            <span className="salon-client-avatar" aria-hidden>
              {(profile.name || profile.email).charAt(0).toUpperCase()}
            </span>
            <h3>{profile.name || 'Cliente inscrite'}</h3>
            <span className="badge">Compte Mon espace</span>
            <h4>Coordonnées</h4>
            <p>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </p>
            {profile.phone && (
              <p>
                <a href={`tel:${profile.phone}`}>{profile.phone}</a>
              </p>
            )}
            <p className="small">
              Inscrite le{' '}
              {date(profile.created_at, {
                timeZone: timezone,
                dateStyle: 'medium',
              })}
            </p>
            <h4>Ses rendez-vous</h4>
            <p>
              <AdminIcon name="bookings" /> {profile.bookings} rendez-vous lié
              {profile.bookings > 1 ? 's' : ''} à ce compte
            </p>
            <Link
              className="button"
              href={`/admin/bookings?client=${profile.id}`}
            >
              Voir les rendez-vous →
            </Link>
          </aside>
        )}
      </div>
      {!rows.length && (
        <p className="empty-state">
          {query
            ? 'Aucune cliente inscrite ne correspond à cette recherche.'
            : 'Aucune cliente inscrite pour le moment. Les clientes sans compte restent accessibles dans leurs rendez-vous.'}
        </p>
      )}
      <p className="notice">
        Les réservations sans compte restent consultables dans Rendez-vous.
      </p>
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
