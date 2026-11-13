'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {useI18n} from './locale-provider';
import { CustomerPrivacy } from './customer-privacy';
import { AppointmentNote } from './appointment-note';
import { entities, type Field } from '@/lib/admin-config';
import { api, ApiError, errorMessage } from '@/lib/client';
import {
  dateLabel,
  localInstant,
  statusLabels,
  transitions,
  money,
  type Status,
} from '@/lib/domain';
export function Logout() {
  const{t}=useI18n();
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <>
      <button
        className="button secondary"
        onClick={async () => {
          try {
            await api('/api/auth/logout', {});
            router.replace('/admin/login');
            router.refresh();
          } catch {
            setError('common.error');
          }
        }}
      >
        {t('auth.logout')}
      </button>
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
    </>
  );
}
export function AuthForm({
  mode = 'login',
  configured = true,
}: {
  mode?: 'login' | 'reset' | 'password';
  configured?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          const result = await api<{ message?: string }>(
            `/api/auth/${mode}`,
            Object.fromEntries(data.entries()),
          );
          if (mode === 'login') {
            router.replace('/admin');
            router.refresh();
          } else setMessage(result.message ?? 'Demande enregistrée.');
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {!configured && (
        <p className="notice">
          L’accès sécurisé nécessite la configuration Supabase. Consultez le
          guide de déploiement du projet.
          {process.env.NODE_ENV === 'development' && (
            <>
              <br />
              <Link className="text-link" href="/admin/preview">
                Ouvrir l’atelier local interactif ↗
              </Link>
            </>
          )}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {mode !== 'password' && (
        <label>
          Adresse e-mail
          <input type="email" name="email" autoComplete="username" required />
        </label>
      )}
      {mode !== 'reset' && (
        <label>
          {mode === 'password'
            ? 'Nouveau mot de passe (12 caractères minimum)'
            : 'Mot de passe'}
          <input
            type="password"
            name="password"
            autoComplete={
              mode === 'password' ? 'new-password' : 'current-password'
            }
            minLength={mode === 'password' ? 12 : 1}
            maxLength={128}
            required
          />
        </label>
      )}
      <button className="button" disabled={busy || !configured}>
        {busy
          ? 'Un instant…'
          : mode === 'login'
            ? 'Se connecter ↗'
            : mode === 'reset'
              ? 'Recevoir les instructions'
              : 'Mettre à jour'}
      </button>
      {mode === 'login' && (
        <p style={{ marginTop: 20 }}>
          <Link className="text-link" href="/admin/reset">
            Mot de passe oublié ?
          </Link>
        </p>
      )}
    </form>
  );
}
type Row = Record<string, unknown>;
function shortAddress(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function initial(fields: Field[], row?: Row, refs: Record<string, Row[]> = {}) {
  return Object.fromEntries(
    fields.map((f) => [
      f.key,
      row?.[f.key] ??
        (f.options?.length
          ? f.key === 'weekday'
            ? Number(f.options[0].value)
            : f.options[0].value
          : f.ref && !f.nullable
            ? (refs[f.ref]?.[0]?.id ?? '')
            : f.type === 'checkbox'
              ? false
              : f.type === 'number'
                ? (f.min ?? 0)
                : ''),
    ]),
  );
}
function datetime(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
  return parts.replace(' ', 'T');
}
export function EntityManager({
  slug,
  rows,
  refs,
  canEdit,
  localPreview = false,
  onSave,
  onRemove,
}: {
  slug: string;
  rows: Row[];
  refs: Record<string, Row[]>;
  canEdit: boolean;
  localPreview?: boolean;
  onSave?: (row: Row) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
}) {
  const config = entities[slug];
  const router = useRouter();
  const [edit, setEdit] = useState<Row | null>(
    slug === 'settings' ? (rows[0] ?? null) : null,
  );
  const [values, setValues] = useState<Row>(() =>
    initial(config.fields, slug === 'settings' ? rows[0] : undefined, refs),
  );
  const [open, setOpen] = useState(slug === 'settings');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [affected, setAffected] = useState<{ reference: string }[]>([]);
  function openForm(row?: Row) {
    setAffected([]);
    setEdit(row ?? null);
    setValues(initial(config.fields, row, refs));
    setOpen(true);
    setError('');
    setMessage('');
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload: Row = { ...values };
      for (const f of config.fields) {
        if (
          f.type === 'datetime-local' &&
          typeof payload[f.key] === 'string' &&
          !(payload[f.key] as string).endsWith('Z') &&
          !(payload[f.key] as string).match(/[+-]\d\d:\d\d$/)
        ) {
          const [d, t] = (payload[f.key] as string).split('T');
          payload[f.key] = localInstant(d, t);
        }
        if (f.nullable && payload[f.key] === '') payload[f.key] = null;
      }
      if (edit) payload.id = edit.id;
      if (slug === 'settings') payload.id = 1;
      if (onSave) await onSave(payload);
      else await api(`/api/admin/${slug}`, payload);
      setMessage(
        localPreview
          ? 'Modifications enregistrées dans ce navigateur.'
          : 'Modifications enregistrées.',
      );
      setAffected([]);
      setOpen(false);
      if (!localPreview) router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setAffected(e instanceof ApiError ? e.affected : []);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      if (onRemove) await onRemove(id);
      else await api(`/api/admin/${slug}`, { id }, 'DELETE');
      setConfirmDelete(null);
      setMessage('Élément retiré.');
      setAffected([]);
      if (!localPreview) router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setAffected(e instanceof ApiError ? e.affected : []);
    } finally {
      setBusy(false);
    }
  }
  const visible = rows.filter((row) =>
    JSON.stringify(row).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {affected.length > 0 && (
        <div className="notice">
          <p>Rendez-vous concernés :</p>
          {affected.map((a) => (
            <p key={a.reference}>
              <Link
                className="text-link"
                href={`/admin/appointments?reference=${a.reference}`}
              >
                {a.reference} ↗
              </Link>
            </p>
          ))}
        </div>
      )}
      {slug === 'availability' && (
        <p className="notice">
          Utilisez plusieurs plages par jour pour représenter les pauses.
          Configurez le salon et chaque membre de l’équipe. Un changement qui
          rend un rendez-vous existant impossible est refusé ; les rendez-vous
          concernés sont indiqués.
        </p>
      )}
      {slug === 'staff' && (
        <p className="notice">
          Un équipement partagé doit être déclaré comme ressource distincte.
          Attribuez ensuite les qualifications et les équipements par
          prestation.
        </p>
      )}
      {slug === 'offers' && (
        <p className="notice">
          Les montants fixes sont en centimes MAD. Associez les prestations dans
          « Éligibilité des offres ». Une seule offre par prestation, la plus
          avantageuse, sera appliquée.
        </p>
      )}
      {slug === 'settings' && (
        <p className="notice">
          Les demandes en attente réservent leur capacité sans expiration
          automatique. Confirmez ou refusez-les régulièrement. La réservation ne
          peut être ouverte qu’après configuration des horaires, prestations,
          équipe et politiques.
        </p>
      )}
      <div className="admin-toolbar">
        <label>
          Rechercher
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {canEdit && (
          <button
            className="button"
            onClick={() => openForm(slug === 'settings' ? rows[0] : undefined)}
          >
            {slug === 'settings' ? 'Modifier les réglages' : '+ Ajouter'}
          </button>
        )}
      </div>
      {open && canEdit && (
        <form className="admin-form" onSubmit={save}>
          <h2>{edit ? 'Modifier' : 'Ajouter'}</h2>
          <div className="form-grid">
            {config.fields.map((f) => (
              <label
                className={f.type === 'checkbox' ? 'checkbox-label' : ''}
                key={f.key}
              >
                {f.type === 'checkbox' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={!!values[f.key]}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.checked })
                      }
                    />
                    {f.label}
                  </>
                ) : (
                  <>
                    {localPreview ? ({image_path:'Image de présentation',hero_image_path:'Image d’accueil',logo_path:'Logo',path:'Image de la galerie'} as Record<string,string>)[f.key] ?? f.label : f.label}
                    {localPreview &&
                    [
                      'image_path',
                      'hero_image_path',
                      'logo_path',
                      'path',
                    ].includes(f.key) ? (
                      <select
                        value={String(values[f.key] ?? '')}
                        onChange={(e) =>
                          setValues({ ...values, [f.key]: e.target.value })
                        }
                      >
                        <option value="">
                          Choisir une image de la galerie
                        </option>
                        {(refs.gallery ?? []).map((g) => (
                          <option key={String(g.id)} value={String(g.path)}>
                            {String(g.alt ?? 'Image')}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={String(values[f.key] ?? '')}
                        onChange={(e) =>
                          setValues({ ...values, [f.key]: e.target.value })
                        }
                      />
                    ) : f.type === 'select' ? (
                      <select
                        value={String(values[f.key] ?? '')}
                        required={!f.nullable}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            [f.key]:
                              f.key === 'weekday'
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                      >
                        <option value="">
                          {f.nullable ? 'Non précisé' : 'Choisir…'}
                        </option>
                        {(f.ref
                          ? (refs[f.ref] ?? []).map((r) => ({
                              value: String(r.id),
                              label: String(r.name ?? r.id),
                            }))
                          : (f.options ?? [])
                        ).map((o) => (
                          <option value={o.value} key={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        value={
                          f.type === 'datetime-local' &&
                          String(values[f.key]).match(/Z$|[+-]\d\d:\d\d$/)
                            ? datetime(values[f.key])
                            : String(values[f.key] ?? '')
                        }
                        min={f.min}
                        max={f.max}
                        required={
                          !f.nullable &&
                          [
                            'name',
                            'slug',
                            'starts_at',
                            'ends_at',
                            'opens',
                            'closes',
                            'reason',
                            'alt',
                            'path',
                            'key',
                            'title',
                          ].includes(f.key)
                        }
                        onChange={(e) => {
                          const value = f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value;
                          setValues(previous => ({...previous,[f.key]:value,...(f.key === 'name' && !edit && config.fields.some(field => field.key === 'slug') && (!previous.slug || previous.slug === shortAddress(String(previous.name ?? ''))) ? {slug:shortAddress(String(value))} : {})}));
                        }}
                      />
                    )}
                  </>
                )}
              </label>
            ))}
          </div>
          <div className="inline-actions">
            <button className="button" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
          </div>
        </form>
      )}
      <div className="record-list">
        {visible.map((row) => (
          <article className="record" key={String(row.id)}>
            <div className="record-heading">
              <h2>
                {String(row.name ?? row.title ?? row.reason ?? config.title)}
              </h2>
              {canEdit && (
                <div className="inline-actions">
                  <button
                    className="button secondary"
                    onClick={() => openForm(row)}
                  >
                    Modifier
                  </button>
                  {config.deletable &&
                    (confirmDelete === String(row.id) ? (
                      <>
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => remove(String(row.id))}
                        >
                          Confirmer le retrait
                        </button>
                        <button
                          className="text-link"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Conserver
                        </button>
                      </>
                    ) : (
                      <button
                        className="button secondary"
                        onClick={() => setConfirmDelete(String(row.id))}
                      >
                        Retirer
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="entity-summary">
              {typeof row.duration_minutes === 'number' && (
                <span>{row.duration_minutes} min</span>
              )}
              {typeof row.price_minor === 'number' && (
                <span>{money(row.price_minor)}</span>
              )}
              {typeof row.published === 'boolean' && (
                <span>
                  {row.published ? 'Publié sur le site' : 'Brouillon'}
                </span>
              )}
              {typeof row.active === 'boolean' && (
                <span>{row.active ? 'Actif' : 'Inactif'}</span>
              )}
            </div>
            {!!row.description && <p>{String(row.description)}</p>}
            <details className="entity-details">
              <summary>Informations complètes</summary>
              <dl>
                {config.fields.map((f) => (
                  <div style={{ display: 'contents' }} key={f.key}>
                    <dt>{f.label}</dt>
                    <dd>
                      {f.ref
                        ? String(
                            refs[f.ref]?.find((r) => r.id === row[f.key])
                              ?.name ??
                              row[f.key] ??
                              'Salon',
                          )
                        : localPreview &&
                            typeof row[f.key] === 'string' &&
                            String(row[f.key]).startsWith('data:image/')
                          ? 'Image enregistrée dans ce navigateur'
                          : typeof row[f.key] === 'boolean'
                            ? row[f.key]
                              ? 'Oui'
                              : 'Non'
                            : String(row[f.key] ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
            {slug === 'customers' && (
              <Link
                className="text-link"
                href={
                  localPreview
                    ? '/admin/preview?section=appointments'
                    : `/admin/appointments?customer=${row.id}`
                }
              >
                Voir les rendez-vous ↗
              </Link>
            )}
            {slug === 'customers' && canEdit && !localPreview && (
              <CustomerPrivacy id={String(row.id)} />
            )}
          </article>
        ))}
        {!visible.length && (
          <p className="empty-state">Aucun élément pour le moment.</p>
        )}
      </div>
    </>
  );
}
export function ImageUpload() {
  const{t}=useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className="admin-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const data = new FormData(e.currentTarget);
          const response = await fetch('/api/admin/upload', {
            method: 'POST',
            body: data,
          });
          const result = await response.json();
          if (!response.ok) throw Error(result.error);
          setMessage(result.path);
        } catch {
          setError('common.error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{t('admin.upload')}</h2>
      <p className="small">
        {t('admin.uploadNote')}
      </p>
      <label>
        {t('admin.file')}
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <button className="button secondary" disabled={busy}>
        {t(busy?'common.loading':'admin.uploadAction')}
      </button>
      {message && (
        <p className="success">
          {t('admin.uploadPath')}{' '}
          <code>{message}</code>
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </form>
  );
}
export type AppointmentRow = {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  scheduling_mode?: 'interval' | 'diary';
  status: Status;
  total_minor: number;
  uncertain: boolean;
  source: string;
  notes: string;
  internal_notes: string;
  created_at: string;
  customers: { name: string; phone: string; email: string | null } | null;
  appointment_items: {
    name: string;
    duration_minutes: number;
    sequence: number;
    price_type: string;
    original_minor: number | null;
    discount_minor: number;
    final_minor: number | null;
    promotion_name: string | null;
    starts_at: string;
    ends_at: string;
    resources: { name: string } | null;
  }[];
};
export function AppointmentList({ rows }: { rows: AppointmentRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{
    id: string;
    action: string;
  } | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState<string | null>(null);
  const [history, setHistory] = useState<
    { action: string; created_at: string; actor: string }[]
  >([]);
  async function change() {
    if (!selected) return;
    setBusy(selected.id);
    setError('');
    try {
      await api('/api/admin/appointments', {
        id: selected.id,
        action: selected.action,
        ...(selected.action === 'reschedule'
          ? { start: localInstant(date, time) }
          : {}),
        reason,
      });
      setSelected(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {selected && (
        <div className="admin-form">
          <h2>
            {selected.action === 'reschedule'
              ? 'Déplacer le rendez-vous'
              : `Confirmer : ${statusLabels[selected.action as Status]}`}
          </h2>
          {selected.action === 'reschedule' && (
            <div className="form-grid">
              <label>
                Date (Casablanca)
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Heure
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
            </div>
          )}
          <label>
            Motif / note
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="inline-actions">
            <button
              className="button"
              disabled={
                !!busy || (selected.action === 'reschedule' && (!date || !time))
              }
              onClick={change}
            >
              Confirmer
            </button>
            <button
              className="button secondary"
              onClick={() => setSelected(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
      <div className="record-list">
        {rows.map((row) => (
          <article className="record" key={row.id}>
            <div className="record-heading">
              <div>
                <span className="badge">{statusLabels[row.status]}</span>
                <h2 style={{ marginTop: 12 }}>
                  {row.customers?.name ?? 'Cliente'} · {row.reference}
                </h2>
              </div>
              <span>{dateLabel(row.starts_at)}</span>
            </div>
            <p>
              Fin : {dateLabel(row.ends_at)} · Origine : {row.source}
            </p>
            <p>
              {row.appointment_items
                .map((i) => `${i.name} (${i.duration_minutes} min)`)
                .join(' · ')}
            </p>
            <p>
              {row.customers?.phone && (
                <a className="text-link" href={`tel:${row.customers.phone}`}>
                  {row.customers.phone}
                </a>
              )}{' '}
              {row.customers?.email}
            </p>
            {row.notes && (
              <p className="prose">Note de la cliente : {row.notes}</p>
            )}
            <details className="appointment-details">
              <summary>Détails du rendez-vous</summary>
              <p>Créé le {dateLabel(row.created_at)}</p>
              <p>
                {row.uncertain ? 'Montant connu estimé' : 'Total estimé'} :{' '}
                {money(row.total_minor)}
                {row.uncertain ? ' + prix à confirmer' : ''}
              </p>
              {[...row.appointment_items]
                .sort((a, b) => a.sequence - b.sequence)
                .map((item, i) => (
                  <div className="basket-row" key={i}>
                    <strong>{item.name}</strong>
                    <p>
                      {item.duration_minutes} min ·{' '}
                      {item.resources?.name ?? 'Prestataire'} ·{' '}
                      {dateLabel(item.starts_at)} → {dateLabel(item.ends_at)}
                    </p>
                    <p>
                      {item.final_minor === null ? (
                        'Sur consultation'
                      ) : (
                        <>
                          {item.discount_minor > 0 && (
                            <del>{money(item.original_minor ?? 0)}</del>
                          )}{' '}
                          {money(item.final_minor)}{' '}
                          {item.price_type === 'starting'
                            ? '(à partir de)'
                            : ''}
                          {item.promotion_name
                            ? ` · ${item.promotion_name} (−${money(item.discount_minor)})`
                            : ''}
                        </>
                      )}
                    </p>
                  </div>
                ))}
              <AppointmentNote id={row.id} initial={row.internal_notes} />
            </details>
            <div className="record-actions">
              {transitions[row.status]
                .filter((s) => s !== 'cancelled_by_customer')
                .map((s) => (
                  <button
                    className="button secondary"
                    disabled={!!busy}
                    key={s}
                    onClick={() => {
                      setSelected({ id: row.id, action: s });
                      setReason('');
                    }}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              {['pending', 'confirmed'].includes(row.status) && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setSelected({ id: row.id, action: 'reschedule' });
                    setReason('');
                  }}
                >
                  Déplacer
                </button>
              )}
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    const data = await api<typeof history>(
                      `/api/admin/history?id=${row.id}`,
                      undefined,
                      'GET',
                    );
                    setHistory(data);
                    setDetails(row.id);
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Historique
              </button>
            </div>
            {details === row.id && (
              <div style={{ marginTop: 20 }}>
                {history.map((h, i) => (
                  <p key={i}>
                    {dateLabel(h.created_at)} · {h.action} ·{' '}
                    {h.actor === 'customer' ? 'Cliente' : 'Salon'}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
        {!rows.length && (
          <p className="empty-state">Aucun rendez-vous sur cette période.</p>
        )}
      </div>
    </>
  );
}
