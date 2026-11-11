'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Temporal } from '@js-temporal/polyfill';
import { entities, type Field } from '@/lib/admin-config';
import { api, ApiError } from '@/lib/client';
import { useI18n } from './locale-provider';
import { CustomerPrivacy } from './customer-privacy';
type Row = Record<string, unknown>;
function defaults(fields: Field[], row?: Row) {
  return Object.fromEntries(
    fields.map((f) => {
      const v = row?.[f.key];
      return [
        f.key,
        f.key === 'fields'
          ? JSON.stringify(v ?? {}, null, 2)
          : f.type === 'datetime-local' && v
            ? String(v)
            : (v ??
              (f.type === 'checkbox'
                ? false
                : f.type === 'number'
                  ? (f.min ?? 0)
                  : '')),
      ];
    }),
  );
}
export function FatuEntityManager({
  slug,
  rows,
  refs,
  timezone = 'Africa/Casablanca',
  onSave,
  onRemove,
}: {
  slug: string;
  rows: Row[];
  refs: Record<string, Row[]>;
  timezone?: string;
  onSave?: (row: Row) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const config = entities[slug];
  const router = useRouter();
  const [edit, setEdit] = useState<Row | null>(
    slug === 'settings' ? (rows[0] ?? null) : null,
  );
  const [values, setValues] = useState<Row>(() =>
    defaults(config.fields, slug === 'settings' ? rows[0] : undefined),
  );
  const [open, setOpen] = useState(slug === 'settings');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [remove, setRemove] = useState<string | null>(null);
  function label(f: Field) {
    const key = `field.${f.key}`;
    return t(key) === key ? t(f.label) : t(key);
  }
  function openForm(row?: Row) {
    setEdit(row ?? null);
    const next = defaults(config.fields, row);
    for (const f of config.fields) {
      if (f.type === 'datetime-local' && next[f.key])
        next[f.key] = Temporal.Instant.from(String(next[f.key]))
          .toZonedDateTimeISO(timezone)
          .toPlainDateTime()
          .toString()
          .slice(0, 16);
    }
    setValues(next);
    setOpen(true);
    setMessage('');
  }
  function fail(e: unknown) {
    setMessage(e instanceof ApiError ? `error.${e.code}` : 'common.error');
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload = { ...values };
      for (const f of config.fields) {
        if (f.nullable && payload[f.key] === '') payload[f.key] = null;
        if (f.type === 'datetime-local' && payload[f.key])
          payload[f.key] = Temporal.ZonedDateTime.from(
            `${payload[f.key]}[${timezone}]`,
            { disambiguation: 'reject' },
          )
            .toInstant()
            .toString();
      }
      if (edit) payload.id = edit.id;
      if (slug === 'settings') payload.id = 1;
      if (onSave) await onSave(payload);
      else await api(`/api/admin/${slug}`, payload);
      setOpen(false);
      setMessage(onSave ? 'admin.previewSaved' : 'common.saved');
      if (!onSave) router.refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {message && (
        <p
          className={
            message === 'common.saved' || message === 'admin.previewSaved'
              ? 'success'
              : 'error'
          }
          role="status"
        >
          {t(message) === message ? t('common.error') : t(message)}
        </p>
      )}
      {['locations', 'service-cities', 'city-hours'].includes(slug) && (
        <p className="notice">{t('admin.citySetup')}</p>
      )}
      {slug === 'faqs' && <p className="notice">{t('admin.faqKey')}</p>}
      {slug === 'translations' && (
        <p className="notice">{t('admin.translationHelp')}</p>
      )}
      <div className="admin-toolbar">
        <label>
          {t('common.search')}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="button"
          onClick={() => openForm(slug === 'settings' ? rows[0] : undefined)}
        >
          {t(slug === 'settings' ? 'common.edit' : 'common.add')} +
        </button>
      </div>
      {open && (
        <form className="admin-form" onSubmit={save}>
          <h2>{t(edit ? 'common.edit' : 'common.add')}</h2>
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
                    {label(f)}
                  </>
                ) : (
                  <>
                    {label(f)}
                    {f.type === 'textarea' ? (
                      <textarea
                        rows={f.key === 'fields' ? 8 : 4}
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
                        <option value="">{t('common.choose')}</option>
                        {(f.ref
                          ? (refs[f.ref] ?? []).map((r) => ({
                              value: String(r.id),
                              label: String(r.name ?? r.id),
                            }))
                          : (f.options ?? [])
                        ).map((o) => (
                          <option key={o.value} value={o.value}>
                            {f.ref
                              ? o.label
                              : f.key === 'weekday'
                                ? new Intl.DateTimeFormat(locale, {
                                    weekday: 'long',
                                    timeZone: 'UTC',
                                  }).format(
                                    new Date(
                                      Date.UTC(2026, 0, 4 + Number(o.value)),
                                    ),
                                  )
                                : t(`option.${o.value}`) === `option.${o.value}`
                                  ? o.label
                                  : t(`option.${o.value}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        min={f.min}
                        max={f.max}
                        step={f.type === 'number' ? 1 : undefined}
                        value={String(values[f.key] ?? '')}
                        required={
                          !f.nullable &&
                          [
                            'name',
                            'slug',
                            'title',
                            'key',
                            'path',
                            'alt',
                            'reason',
                            'city_id',
                            'entity_id',
                          ].includes(f.key)
                        }
                        onChange={(e) => {
                          const next = {
                            ...values,
                            [f.key]:
                              f.type === 'number'
                                ? e.target.value === ''
                                  ? ''
                                  : Number(e.target.value)
                                : e.target.value,
                          };
                          if (
                            f.key === 'name' &&
                            !edit &&
                            config.fields.some((f) => f.key === 'slug') &&
                            (!values.slug ||
                              values.slug ===
                                String(values.name ?? '')
                                  .normalize('NFD')
                                  .replace(/[\u0300-\u036f]/g, '')
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, '-')
                                  .replace(/^-|-$/g, ''))
                          )
                            next.slug = e.target.value
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-|-$/g, '');
                          setValues(next);
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
              {t(busy ? 'common.saving' : 'common.save')}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
      <div className="admin-record-grid">
        {rows
          .filter((r) =>
            JSON.stringify(r)
              .toLocaleLowerCase(locale)
              .includes(query.toLocaleLowerCase(locale)),
          )
          .map((row) => (
            <article className="admin-record-card" key={String(row.id)}>
              <h3>{String(row.name ?? row.title ?? row.key ?? row.id)}</h3>
              <dl>
                {config.fields
                  .filter((f) => f.type !== 'textarea' && f.key !== 'name')
                  .map((f) => (
                    <div key={f.key}>
                      <dt>{label(f)}</dt>
                      <dd>
                        {f.type === 'checkbox'
                          ? t(row[f.key] ? 'common.yes' : 'common.no')
                          : f.ref
                            ? String(
                                refs[f.ref]?.find((r) => r.id === row[f.key])
                                  ?.name ??
                                  row[f.key] ??
                                  '—',
                              )
                            : String(row[f.key] ?? '—')}
                      </dd>
                    </div>
                  ))}
              </dl>
              <button
                className="button secondary"
                onClick={() => openForm(row)}
              >
                {t('common.edit')}
              </button>
              {config.deletable && (
                <button
                  className="button secondary"
                  onClick={() => setRemove(String(row.id))}
                >
                  {t('common.delete')}
                </button>
              )}
              {remove === row.id && (
                <div className="notice">
                  <p>{t('common.confirmDelete')}</p>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        if (onRemove) await onRemove(String(row.id));
                        else
                          await api(
                            `/api/admin/${slug}`,
                            { id: row.id },
                            'DELETE',
                          );
                        setRemove(null);
                        if (!onRemove) router.refresh();
                      } catch (e) {
                        fail(e);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t('common.delete')}
                  </button>
                  <button onClick={() => setRemove(null)}>
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              {config.table === 'customers' && !onSave && (
                <CustomerPrivacy id={String(row.id)} />
              )}
            </article>
          ))}
      </div>
      {!rows.length && <p className="empty-state">{t('common.empty')}</p>}
    </>
  );
}
