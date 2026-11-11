'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminShell } from './admin-shell';
import { EntityManager } from './admin';
import { Calendar, type CalendarEntry } from './calendar';
import { StatValue } from './stat-value';
import { WebsiteWorkspace } from './website-workspace';
import { entities, entitySchema } from '@/lib/admin-config';
import {
  useDemoState,
  updateDemoState,
  resetDemoState,
} from '@/lib/demo-store';
import { demoCatalog, type DemoRow } from '@/lib/demo-data';
import { calendarWindow } from '@/lib/calendar';
import {
  dateLabel,
  money,
  statusLabels,
  transitions,
} from '@/lib/domain';
import { salonImage } from '@/lib/assets';

function localRow(section: string, row: DemoRow) {
  const candidate = { ...row };
  const images: DemoRow = {};
  for (const k of ['image_path', 'hero_image_path', 'logo_path', 'path']) {
    if (typeof candidate[k] === 'string' && candidate[k]) {
      const value = String(candidate[k]);
      if (
        !(
          /^\/(?!\/)/.test(value) ||
          /^data:image\/(png|jpeg|webp);base64,/.test(value)
        ) ||
        value.length > 1100000
      )
        throw Error('Choisissez une image dans la galerie locale.');
      images[k] = value;
      candidate[k] = '';
    }
  }
  return { ...entitySchema(section).parse(candidate), ...images } as DemoRow;
}
export function LocalAdminWorkspace({
  section,
  date,
  view,
  reference,
}: {
  section: string;
  date?: string;
  view?: string;
  reference?: string;
}) {
  const state = useDemoState();
  const catalog = demoCatalog(state);
  const period = calendarWindow(date, view);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const path = (part: string) => `/admin/preview?section=${part}`;
  const log = (entry: string, change: (s: typeof state) => typeof state) => {
    setError('');
    try {
      updateDemoState((s) => ({
        ...change(s),
        activity: [entry, ...s.activity].slice(0, 100),
      }));
      setMessage('Modifications enregistrées dans ce navigateur.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer.');
    }
  };
  const refs = {
    categories: state.entities.categories ?? [],
    services: state.entities.services ?? [],
    resources: state.entities.staff ?? [],
    promotions: state.entities.offers ?? [],
    gallery: state.entities.gallery ?? [],
  };
  const rows: CalendarEntry[] = state.bookings.map((b) => ({
    reference: b.reference,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status,
    customers: b.customer,
    appointment_items: b.items.map((i) => ({
      name: i.name,
      resource_id: String(state.entities.staff?.[0]?.id ?? ''),
      resources: {
        name: String(state.entities.staff?.[0]?.name ?? 'Prestataire local'),
      },
    })),
  }));
  let content: React.ReactNode;
  if (section === 'overview')
    content = (
      <>
        <section className="studio-welcome">
          <div>
            <span className="eyebrow">VOTRE MAISON, EN UN REGARD</span>
            <h1>
              Bonjour,
              <br />
              place à une <em>belle journée.</em>
            </h1>
            <p>
              Le planning, les petites attentions, les prochaines envies. Tout
              votre salon se retrouve ici.
            </p>
            <div className="inline-actions">
              <Link className="button" href="/reservation">
                + Créer un rendez-vous
              </Link>
              <Link className="button secondary" href={path('calendar')}>
                Ouvrir le planning ↗
              </Link>
            </div>
          </div>
          <div className="studio-welcome-art" aria-hidden>
            <span>g.</span>
            <small>L’ATELIER DE LA MAISON</small>
            <div className="studio-orbit" />
          </div>
        </section>
        <div className="stats">
          {[
            [state.bookings.length, 'Rendez-vous dans votre atelier'],
            [
              state.bookings.filter((b) => b.status === 'pending').length,
              'Demandes à confirmer',
            ],
            [
              money(
                state.bookings
                  .filter((b) => !b.status.startsWith('cancelled'))
                  .reduce((n, b) => n + b.total_minor, 0),
              ),
              'Valeur des rendez-vous · démo',
            ],
            [catalog.services.length, 'Prestations dans votre carte'],
          ].map(([value, label]) => (
            <div className="stat" key={String(label)}>
              <StatValue value={value} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="studio-columns">
          <section className="studio-panel">
            <div className="workspace-heading">
              <div>
                <span className="eyebrow">LES PROCHAINES ATTENTIONS</span>
                <h2>Votre carnet du jour.</h2>
              </div>
              <Link className="text-link" href={path('appointments')}>
                Tout voir ↗
              </Link>
            </div>
            <div className="arrival-list">
              {state.bookings
                .slice(-4)
                .reverse()
                .map((b, i) => (
                  <Link
                    href={`${path('appointments')}&reference=${b.reference}`}
                    className="arrival"
                    key={b.id}
                  >
                    <span className={`arrival-avatar tone-${i % 3}`}>
                      {b.customer.name.charAt(0)}
                    </span>
                    <div>
                      <strong>{b.customer.name}</strong>
                      <small>{b.items.map((i) => i.name).join(' · ')}</small>
                    </div>
                    <div className="arrival-end">
                      <span>
                        {new Intl.DateTimeFormat('fr-MA', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Africa/Casablanca',
                        }).format(new Date(b.starts_at))}
                      </span>
                      <small>{statusLabels[b.status]}</small>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
          <section className="studio-note">
            <span className="eyebrow">LE SENS DU DÉTAIL</span>
            <h2>
              Une maison
              <br />
              qui vous ressemble.
            </h2>
            <p>
              Un nouveau texte, une jolie image, une attention de saison. Faites
              évoluer votre site depuis l’atelier.
            </p>
            <Link className="text-link" href={path('settings')}>
              Personnaliser ma maison ↗
            </Link>
            <span className="note-flower" aria-hidden>
              ✳
            </span>
          </section>
        </div>
        <WebsiteWorkspace preview />
      </>
    );
  else if (section === 'calendar')
    content = (
      <>
        <div className="studio-page-heading">
          <div>
            <span className="eyebrow">LE RYTHME DU SALON</span>
            <h1>Le calendrier</h1>
            <p>
              Un peu d’organisation pour laisser toute la place à l’attention.
            </p>
          </div>
          <Link className="button" href="/reservation">
            + Rendez-vous
          </Link>
        </div>
        <form className="admin-toolbar">
          <input type="hidden" name="section" value="calendar" />
          <label>
            Date
            <input type="date" name="date" defaultValue={period.anchor} />
          </label>
          <label>
            Vue
            <select name="view" defaultValue={period.view}>
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="list">Liste</option>
            </select>
          </label>
          <button className="button">Afficher l’aperçu</button>
        </form>
        <Calendar
          window={period}
          rows={rows}
          closures={[]}
          hours={(state.entities.availability ?? []).map((h) => ({
            resource_id: h.resource_id as string | null,
            weekday: Number(h.weekday),
            opens: String(h.opens),
            closes: String(h.closes),
          }))}
          exceptions={[]}
          resource=""
          query=""
          preview
        />
      </>
    );
  else if (section === 'appointments') {
    const filtered = state.bookings.filter(
      (b) =>
        (!reference || b.reference === reference) &&
        (status === 'all' || b.status === status) &&
        `${b.reference} ${b.customer.name} ${b.items.map((i) => i.name).join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    content = (
      <>
        <div className="studio-page-heading">
          <div>
            <span className="eyebrow">LE CARNET DE LA MAISON</span>
            <h1>Les rendez-vous</h1>
            <p>
              Confirmez une attention, retrouvez une cliente, préparez votre
              journée.
            </p>
          </div>
          <Link className="button" href="/reservation">
            + Nouveau rendez-vous
          </Link>
        </div>
        <div className="admin-toolbar">
          <label>
            Rechercher
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Un nom, une prestation…"
            />
          </label>
          <label>
            Statut
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Tous les rendez-vous</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {reference && (
            <Link className="text-link" href={path('appointments')}>
              Voir tout ↗
            </Link>
          )}
        </div>
        <div className="record-list">
          {filtered.map((b) => (
            <article className="record appointment-studio" key={b.id}>
              <div className="record-heading">
                <div>
                  <span className={`badge status-${b.status}`}>
                    {statusLabels[b.status]}
                  </span>
                  <h2>{b.customer.name}</h2>
                  <p>
                    {b.reference} · {dateLabel(b.starts_at)}
                  </p>
                </div>
                <StatValue value={money(b.total_minor)} />
              </div>
              <p>
                {b.items
                  .map((i) => `${i.name} · ${i.duration_minutes} min`)
                  .join(' / ')}
              </p>
              <div className="record-actions">
                {transitions[b.status]
                  .filter((s) => s !== 'cancelled_by_customer')
                  .map((next) => (
                    <button
                      className="button secondary"
                      key={next}
                      onClick={() =>
                        log(`${b.reference} : ${statusLabels[next]}`, (s) => ({
                          ...s,
                          bookings: s.bookings.map((row) =>
                            row.id === b.id
                              ? {
                                  ...row,
                                  status: next,
                                  history: [
                                    ...row.history,
                                    {
                                      action: next,
                                      created_at: new Date().toISOString(),
                                    },
                                  ],
                                }
                              : row,
                          ),
                        }))
                      }
                    >
                      {statusLabels[next]}
                    </button>
                  ))}
                <Link
                  className="text-link"
                  href={`/reservation/gestion#${b.token}`}
                >
                  Ouvrir le lien privé ↗
                </Link>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <div className="empty-state">
              Aucun rendez-vous pour ces critères.
            </div>
          )}
        </div>
      </>
    );
  } else if (section === 'gallery')
    content = (
      <>
        <div className="studio-page-heading">
          <div>
            <span className="eyebrow">LES IMAGES DE LA MAISON</span>
            <h1>Galerie</h1>
            <p>
              Ajoutez une image, publiez-la et retrouvez-la dans les sélecteurs
              du site.
            </p>
          </div>
        </div>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const file = f.get('file');
            setError('');
            try {
              if (
                !(file instanceof File) ||
                !['image/png', 'image/jpeg', 'image/webp'].includes(
                  file.type,
                ) ||
                file.size > 750 * 1024
              )
                throw Error(
                  'Choisissez un fichier JPEG, PNG ou WebP de moins de 750 Ko pour le stockage local.',
                );
              const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(Error('Lecture impossible.'));
                reader.readAsDataURL(file);
              });
              log('Image ajoutée à la galerie locale', (s) => ({
                ...s,
                entities: {
                  ...s.entities,
                  gallery: [
                    ...(s.entities.gallery ?? []),
                    {
                      id: crypto.randomUUID(),
                      path: data,
                      alt: String(f.get('alt')),
                      album: 'Mes images',
                      published: true,
                      position: (s.entities.gallery ?? []).length,
                    },
                  ],
                },
              }));
              form.reset();
            } catch (ex) {
              setError(ex instanceof Error ? ex.message : 'Image invalide.');
            }
          }}
        >
          <h2>Une nouvelle image</h2>
          <div className="form-grid">
            <label>
              Choisir une image
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg,image/webp"
                required
              />
            </label>
            <label>
              Description accessible
              <input name="alt" required placeholder="Décrivez votre image" />
            </label>
          </div>
          <p className="small">
            Stockage dans ce navigateur · 750 Ko maximum · aucun envoi au
            serveur.
          </p>
          <button className="button">Ajouter à la galerie</button>
        </form>
        <div className="studio-gallery">
          {(state.entities.gallery ?? []).map((g) => (
            <article key={String(g.id)}>
              <Image
                src={salonImage(String(g.path))}
                alt={String(g.alt)}
                width={500}
                height={450}
                unoptimized
              />
              <div>
                <h3>{String(g.alt)}</h3>
                <div className="inline-actions">
                  <button
                    className="button secondary"
                    onClick={() =>
                      log('Image d’accueil modifiée', (s) => ({
                        ...s,
                        entities: {
                          ...s.entities,
                          settings: [
                            {
                              ...s.entities.settings[0],
                              hero_image_path: g.path,
                            },
                          ],
                        },
                      }))
                    }
                  >
                    Utiliser pour l’accueil
                  </button>
                  <button
                    className="text-link"
                    onClick={() =>
                      log('Image retirée de la galerie', (s) => ({
                        ...s,
                        entities: {
                          ...s.entities,
                          gallery: s.entities.gallery.filter(
                            (row) => row.id !== g.id,
                          ),
                        },
                      }))
                    }
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </>
    );
  else if (section === 'activity')
    content = (
      <>
        <span className="eyebrow">LE JOURNAL DE L’ATELIER</span>
        <h1>L’activité du salon</h1>
        <div className="record-list">
          {state.activity.length ? (
            state.activity.map((entry, i) => (
              <div className="record activity-row" key={i}>
                <span aria-hidden>↗</span>
                <p>{entry}</p>
                <span className="badge">Local</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              Vos modifications apparaîtront ici. Essayez de modifier une
              prestation.
            </div>
          )}
        </div>
      </>
    );
  else if (section === 'team')
    content = (
      <>
        <span className="eyebrow">LES CLÉS DE LA MAISON</span>
        <h1>Les accès à la gestion</h1>
        <p>
          Simulation des accès uniquement : aucun compte Auth ni e-mail réel
          n’est créé.
        </p>
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            log('Accès de démonstration ajouté', (s) => ({
              ...s,
              entities: {
                ...s.entities,
                admin_profiles: [
                  ...(s.entities.admin_profiles ?? []),
                  {
                    id: crypto.randomUUID(),
                    name: String(f.get('name')),
                    email: String(f.get('email')),
                    active: true,
                  },
                ],
              },
            }));
            form.reset();
          }}
        >
          <h2>Ajouter un accès de démonstration</h2>
          <div className="form-grid">
            <label>
              Nom
              <input name="name" required minLength={2} />
            </label>
            <label>
              E-mail fictif
              <input
                type="email"
                name="email"
                placeholder="nom@example.test"
                required
              />
            </label>
          </div>
          <button className="button">Ajouter l’accès local</button>
        </form>
        <div className="record-list">
          {(state.entities.admin_profiles ?? []).map((a) => (
            <article className="record" key={String(a.id)}>
              <h2>{String(a.name)}</h2>
              <p>{String(a.email)} · Administrateur</p>
              <button
                className="button secondary"
                onClick={() => {
                  if (
                    a.active &&
                    (state.entities.admin_profiles ?? []).filter(
                      (r) => r.active,
                    ).length <= 1
                  ) {
                    setError('Conservez au moins un administrateur actif.');
                    return;
                  }
                  log('Accès local mis à jour', (s) => ({
                    ...s,
                    entities: {
                      ...s.entities,
                      admin_profiles: s.entities.admin_profiles.map((r) =>
                        r.id === a.id ? { ...r, active: !r.active } : r,
                      ),
                    },
                  }));
                }}
              >
                {a.active ? 'Désactiver' : 'Réactiver'}
              </button>
            </article>
          ))}
        </div>
      </>
    );
  else if (entities[section])
    content = (
      <>
        <div className="studio-page-heading">
          <div>
            <span className="eyebrow">VOTRE ATELIER, VOS ENVIES</span>
            <h1>{entities[section].title}</h1>
            <p>
              Créez, ajustez et retrouvez vos modifications sur le site local.
            </p>
          </div>
          <Link className="text-link" href="/">
            Voir le site ↗
          </Link>
        </div>
        <EntityManager
          key={section}
          slug={section}
          rows={state.entities[section] ?? []}
          refs={refs}
          canEdit
          localPreview
          onSave={async (row) => {
            const payload = localRow(section, row);
            const id = payload.id ?? crypto.randomUUID();
            updateDemoState((s) => ({
              ...s,
              entities: {
                ...s.entities,
                [section]: [
                  ...(s.entities[section] ?? []).filter((r) => r.id !== id),
                  {
                    ...(s.entities[section] ?? []).find((r) => r.id === id),
                    ...payload,
                    id,
                  },
                ],
              },
              activity: [
                `${entities[section].title} : ${String(payload.name ?? payload.title ?? 'modification')}`,
                ...s.activity,
              ].slice(0, 100),
            }));
          }}
          onRemove={async (id) => {
            updateDemoState((s) => ({
              ...s,
              entities: {
                ...s.entities,
                [section]: (s.entities[section] ?? []).filter(
                  (r) => r.id !== id,
                ),
              },
              activity: [
                `${entities[section].title} : élément retiré`,
                ...s.activity,
              ],
            }));
          }}
        />
      </>
    );
  else
    content = (
      <div className="empty-state">
        <h1>Cette section est introuvable.</h1>
        <Link className="button" href={path('overview')}>
          Retour à l’atelier
        </Link>
      </div>
    );
  return (
    <AdminShell
      staff={{ display_name: 'Votre atelier local', role: 'owner' }}
      preview
    >
      <div className="studio-local-tools">
        <span>
          <span className="live-dot" /> Modifications sauvegardées sur cet
          appareil
        </span>
        <button
          className="text-link"
          onClick={() => {
            if (
              window.confirm(
                'Réinitialiser toutes les modifications et réservations de démonstration de ce navigateur ?',
              )
            ) {
              resetDemoState();
              setMessage('La démonstration a été réinitialisée.');
              setError('');
            }
          }}
        >
          Réinitialiser la démo
        </button>
      </div>
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {content}
    </AdminShell>
  );
}
