'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Temporal } from '@js-temporal/polyfill';
import { entities, type Field } from '@/lib/admin-config';
import Image from 'next/image';
import { salonImage } from '@/lib/assets';
import { newSlug, promotionState, toMinor, weekdays } from '@/lib/admin-ui';
import { api, ApiError } from '@/lib/client';
import { useI18n } from './locale-provider';
import { CustomerPrivacy } from './customer-privacy';
import { AdminIcon } from './admin-icon';
import { PermanentDelete } from './permanent-delete';
import { ServiceStatus } from './service-status';
type Row = Record<string, unknown>;
type Hour = { weekday: number; opens: string; closes: string };
export type OwnerRelations = { services: string[]; hours: Hour[] };
const labels: Record<string, string> = {
  subcategory: 'Sous-catégorie',
  service_group: 'Groupe de prestations',
  service_type: 'Nature de la prestation',
  name: 'Nom',
  category_id: 'Catégorie',
  price_minor: 'Prix (MAD)',
  price_type: 'Type de prix',
  duration_minutes: 'Durée (minutes)',
  description: 'Description',
  published: 'Afficher sur le site',
  bookable: 'Disponible à la réservation',
  featured: 'Mettre à la une',
  archived: 'Archiver',
  position: 'Ordre d’affichage',
  buffer_before: 'Préparation avant la prestation (minutes)',
  buffer_after: 'Temps après la prestation (minutes)',
  preparation: 'Conseils de préparation',
  included_items: 'Ce qui est inclus',
  active: 'Actif',
  resource_id: 'Employée ou matériel (vide = tout le salon)',
  service_id: 'Prestation',
  promotion_id: 'Offre',
  city_id: 'Ville',
  weekday: 'Jour',
  opens: 'Ouverture',
  closes: 'Fermeture',
  starts_at: 'Début',
  ends_at: 'Fin',
  day: 'Date',
  reason: 'Motif',
  alt: 'Description de la photo pour l’accessibilité',
  album: 'Album',
  title: 'Titre',
  body: 'Texte',
  consent_confirmed: 'Autorisation de publication confirmée',
  temporary: 'Photo temporaire (ne sera pas publiée)',
  verified: 'Avis vérifié',
  rating: 'Note sur 5',
  video_url: 'Lien vidéo (facultatif)',
  travel_fee_minor: 'Frais de déplacement (MAD)',
  code: 'Code promotionnel (facultatif)',
  max_uses: 'Nombre maximal d’utilisations (facultatif)',
  terms: 'Conditions',
  phone: 'Téléphone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  address: 'Adresse',
  map_url: 'Lien de la carte',
  instagram: 'Instagram',
  about: 'Présentation du salon',
  hero_title: 'Titre de l’accueil',
  hero_subtitle: 'Sous-titre de l’accueil',
  brand_color: 'Couleur du salon',
  approved: 'Informations du salon vérifiées',
  booking_enabled: 'Ouvrir les réservations en ligne',
  privacy_text: 'Politique de confidentialité',
  policy_text: 'Conditions de réservation',
  deposit_policy: 'Conditions d’acompte',
  timezone: 'Fuseau horaire',
  currency: 'Devise',
  notice_minutes: 'Délai minimum avant un rendez-vous (minutes)',
  horizon_days: 'Réserver jusqu’à combien de jours à l’avance ?',
  increment_minutes: 'Intervalle entre les horaires proposés (minutes)',
  cancellation_enabled: 'Autoriser les demandes d’annulation',
  rescheduling_enabled: 'Autoriser les demandes de déplacement',
  cancellation_notice_hours: 'Préavis d’annulation (heures)',
  rescheduling_notice_hours: 'Préavis de déplacement (heures)',
  no_show_grace_minutes: 'Délai avant de déclarer une absence (minutes)',
  locale: 'Langue',
  entity: 'Type de contenu',
  entity_id: 'Contenu à traduire',
  notes: 'Notes internes',
  kind: 'Type',
  value: 'Valeur',
  key: 'Section du site',
};
const options: Record<string, string> = {
  public: 'Pour toutes les clientes',
  members: 'Réservée aux clientes inscrites',
  appointment: 'Prestation de beauté',
  rental: 'Location (demande de renseignements)',
  fixed: 'Prix fixe',
  starting: 'À partir de',
  consultation: 'Sur demande',
  percentage: 'Pourcentage',
  staff: 'Employée',
  equipment: 'Matériel',
  fr: 'Français',
  ar: 'Arabe',
  en: 'Anglais',
  services: 'Prestations',
  categories: 'Catégories',
  cities: 'Villes',
  website_content: 'Textes du site',
  gallery: 'Galerie',
  reviews: 'Avis clients',
  salon_settings: 'Informations du salon',
};
const advancedFields = [
  'bookable',
  'subcategory',
  'service_group',
  'service_type',
  'buffer_before',
  'buffer_after',
  'position',
  'archived',
  'preparation',
  'included_items',
  'code',
  'max_uses',
  'temporary',
  'video_url',
  'duration_minutes',
  'featured',
];
const infoFields = [
  'name',
  'phone',
  'whatsapp',
  'email',
  'address',
  'map_url',
  'instagram',
  'about',
];
const websiteFields = ['hero_title', 'hero_subtitle', 'brand_color'];
const photoFields = ['hero_image_path', 'logo_path'];
const policyFields = [
  'approved',
  'booking_enabled',
  'privacy_text',
  'policy_text',
  'deposit_policy',
  'cancellation_enabled',
  'rescheduling_enabled',
  'cancellation_notice_hours',
  'rescheduling_notice_hours',
];
const imageFields = ['path', 'image_path', 'logo_path', 'hero_image_path'];
const translatedFields: Record<string, string[]> = {
  services: ['name', 'description', 'preparation', 'included_items'],
  categories: ['name', 'description'],
  cities: ['name'],
  website_content: ['title', 'body'],
  gallery: ['title', 'description', 'alt'],
  reviews: ['name', 'body'],
  salon_settings: [
    'name',
    'about',
    'hero_title',
    'hero_subtitle',
    'privacy_text',
    'policy_text',
    'deposit_policy',
    'address',
  ],
};
function monetary(key: string, values: Row) {
  return (
    ['price_minor', 'travel_fee_minor'].includes(key) ||
    (key === 'value' && values.kind === 'fixed')
  );
}
function defaults(
  fields: Field[],
  row: Row | undefined,
  timezone: string,
): Row {
  return Object.fromEntries(
    fields.map((f) => {
      let v =
        row?.[f.key] ??
        (f.type === 'checkbox'
          ? false
          : f.nullable
            ? ''
            : f.type === 'number'
              ? (f.min ?? 0)
              : '');
      if (monetary(f.key, row ?? {}))
        v = row?.[f.key] == null ? '' : Number(row[f.key]) / 100;
      if (f.key === 'fields') v = row?.fields ?? {};
      if (f.type === 'datetime-local' && v)
        v = Temporal.Instant.from(String(v))
          .toZonedDateTimeISO(timezone)
          .toPlainDateTime()
          .toString()
          .slice(0, 16);
      if (!row && f.key === 'duration_minutes') v = '';
      if (f.key === 'service_type') v = row?.service_type ?? 'appointment';
      if (f.key === 'audience') v = row?.audience ?? 'public';
      return [f.key, v];
    }),
  );
}
export function FatuEntityManager({
  slug,
  rows,
  refs,
  timezone = 'Africa/Casablanca',
  currency = 'MAD',
  onSave,
  onRemove,
  view = '',
}: {
  slug: string;
  rows: Row[];
  refs: Record<string, Row[]>;
  timezone?: string;
  currency?: string;
  view?: string;
  onSave?: (row: Row, related?: OwnerRelations) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
}) {
  const { t, money: formatMoney, date } = useI18n();
  const money = (amount: number) => formatMoney(amount, currency);
  const config = entities[slug];
  const router = useRouter();
  const params = useSearchParams();
  const promotion = config.table === 'promotions';
  const employee = slug === 'staff';
  const faq = slug === 'faqs';
  const settings = slug === 'settings';
  const [edit, setEdit] = useState<Row | null>(
    settings ? (rows[0] ?? null) : null,
  );
  const [values, setValues] = useState<Row>(() =>
    defaults(config.fields, settings ? rows[0] : undefined, timezone),
  );
  const [open, setOpen] = useState(settings || params.get('new') === '1');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [categoryFilter, setCategoryFilter] = useState(
    params.get('category') ?? '',
  );
  const [offerFilter, setOfferFilter] = useState('Toutes');
  const [message, setMessage] = useState('');
  const [affected, setAffected] = useState<{ reference: string }[]>([]);
  const [remove, setRemove] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  function openForm(row?: Row) {
    setEdit(row ?? null);
    setValues(defaults(config.fields, row, timezone));
    setOpen(true);
    setMessage('');
    setAffected([]);
    setSelectedServices(
      (refs[promotion ? 'promotion_services' : 'qualifications'] ?? [])
        .filter(
          (r) => r[promotion ? 'promotion_id' : 'resource_id'] === row?.id,
        )
        .map((r) => String(r.service_id)),
    );
    setHours(
      (refs.working_hours ?? [])
        .filter((h) => h.resource_id === row?.id)
        .map((h) => ({
          weekday: Number(h.weekday),
          opens: String(h.opens).slice(0, 5),
          closes: String(h.closes).slice(0, 5),
        })),
    );
  }
  function update(key: string, value: unknown) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  function searchServices(category = categoryFilter) {
    if (!onSave && slug === 'services')
      router.push(
        `/admin/services?${new URLSearchParams({ q: query, category })}`,
      );
  }
  function fail(error: unknown) {
    setMessage(
      error instanceof ApiError
        ? t(`error.${error.code}`) !== `error.${error.code}`
          ? t(`error.${error.code}`)
          : error.message
        : error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer. Réessayez.',
    );
    setAffected(error instanceof ApiError ? error.affected : []);
  }
  async function upload(file: File | undefined, key: string) {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          'La photo n’a pas pu être envoyée. Utilisez un JPEG, PNG ou WebP de 4 Mo maximum.',
        );
      update(key, result.path);
      setMessage('Photo prête. Enregistrez le formulaire pour l’utiliser.');
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setAffected([]);
    try {
      const settingsKeys = settings
        ? view === 'photos'
          ? photoFields
          : view === 'website'
            ? websiteFields
            : view === 'policies'
              ? policyFields
              : view === 'advanced'
                ? config.fields
                    .map((f) => f.key)
                    .filter(
                      (k) =>
                        ![
                          ...infoFields,
                          ...websiteFields,
                          ...photoFields,
                        ].includes(k),
                    )
                : infoFields
        : null;
      const payload = settingsKeys
        ? Object.fromEntries(
            Object.entries(values).filter(([key]) =>
              settingsKeys.includes(key),
            ),
          )
        : { ...values };
      if (values.price_type === 'consultation') payload.price_minor = null;
      for (const f of config.fields) {
        if (!(f.key in payload)) continue;
        if (f.nullable && payload[f.key] === '') payload[f.key] = null;
        if (monetary(f.key, values) && payload[f.key] != null)
          payload[f.key] = toMinor(String(payload[f.key]));
        if (f.type === 'datetime-local' && payload[f.key])
          payload[f.key] = Temporal.ZonedDateTime.from(
            `${payload[f.key]}[${timezone}]`,
            { disambiguation: 'reject' },
          )
            .toInstant()
            .toString();
      }
      if (config.fields.some((f) => f.key === 'slug') && !edit)
        payload.slug = newSlug(
          String(payload.name),
          crypto.randomUUID().slice(0, 8),
        );
      if (faq && !edit) payload.key = `faq.${crypto.randomUUID()}`;
      if (
        slug === 'services' &&
        payload.bookable &&
        (!payload.duration_minutes || payload.service_type === 'rental')
      )
        throw Error(
          'Pour réserver une prestation, renseignez sa durée. Les locations se gèrent par demande de renseignements.',
        );
      if (employee) payload.kind = 'staff';
      if (slug === 'equipment') payload.kind = 'equipment';
      if (values.price_type === 'consultation') payload.price_minor = null;
      if (edit) payload.id = edit.id;
      if (settings) payload.id = 1;
      const related = { services: selectedServices, hours };
      if (promotion && !selectedServices.length)
        throw Error('Choisissez au moins une prestation pour cette offre.');
      if (onSave) await onSave(payload, related);
      else if (promotion || employee)
        await api('/api/admin/owner-form', {
          kind: promotion ? 'promotion' : 'employee',
          data: payload,
          ...related,
        });
      else await api(`/api/admin/${slug}`, payload);
      setOpen(false);
      setMessage(
        onSave
          ? 'Aperçu enregistré dans ce navigateur uniquement. Le site public n’a pas été modifié.'
          : 'Modifications enregistrées.',
      );
      if (!onSave) router.refresh();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }
  function field(f: Field) {
    const key = f.key;
    const label =
      key === 'price_minor'
        ? `Prix (${currency})`
        : key === 'travel_fee_minor'
          ? `Frais de déplacement (${currency})`
          : faq && key === 'title'
            ? 'Question'
            : faq && key === 'body'
              ? 'Réponse'
              : promotion && key === 'value'
                ? values.kind === 'fixed'
                  ? `Réduction (${currency})`
                  : 'Réduction (%)'
                : promotion && key === 'kind'
                  ? 'Type de réduction'
                  : (labels[key] ??
                    (t(`field.${key}`) === `field.${key}`
                      ? t(f.label)
                      : t(`field.${key}`)));
    if (imageFields.includes(key))
      return (
        <div key={key} className="salon-image-field">
          <label>
            {key === 'logo_path'
              ? 'Logo'
              : key === 'hero_image_path'
                ? 'Photo de l’accueil'
                : 'Photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy || !!onSave}
              onChange={(e) => upload(e.target.files?.[0], key)}
            />
          </label>
          {!!values[key] && (
            <p>
              ✓ Photo sélectionnée{' '}
              <button
                type="button"
                onClick={() => update(key, '')}
                disabled={key === 'path'}
              >
                Retirer
              </button>
            </p>
          )}
          {!!values[key] && !onSave && (
            <Image
              unoptimized
              src={salonImage(String(values[key]))}
              alt="Photo sélectionnée"
              width={300}
              height={200}
            />
          )}
          {key === 'path' && !values[key] && (
            <p className="small">Ajoutez une photo avant d’enregistrer.</p>
          )}
          {onSave && (
            <p className="small">
              L’envoi de photos nécessite une connexion au vrai espace
              administrateur.
            </p>
          )}
        </div>
      );
    if (key === 'fields')
      return (
        <div key={key} className="form-grid">
          {(translatedFields[String(values.entity)] ?? []).map((k) => (
            <label key={k}>
              {labels[k] ?? k}
              <textarea
                value={String((values.fields as Row)?.[k] ?? '')}
                onChange={(e) =>
                  update('fields', {
                    ...(values.fields as Row),
                    [k]: e.target.value,
                  })
                }
              />
            </label>
          ))}
        </div>
      );
    if (key === 'entity_id')
      return (
        <label key={key}>
          {label}
          <select
            value={String(values[key] ?? '')}
            required
            onChange={(e) => update(key, e.target.value)}
          >
            <option value="">Choisir le contenu</option>
            {(refs[`translation_${values.entity}`] ?? []).map((r) => (
              <option key={String(r.id)} value={String(r.id)}>
                {String(r.name ?? r.title ?? 'Informations du salon')}
              </option>
            ))}
          </select>
        </label>
      );
    if (f.type === 'checkbox')
      return (
        <label className="checkbox-label" key={key}>
          <input
            type="checkbox"
            checked={!!values[key]}
            onChange={(e) => update(key, e.target.checked)}
          />
          {label}
        </label>
      );
    if (f.type === 'select' || key === 'weekday')
      return (
        <label key={key}>
          {label}
          <select
            required={!f.nullable}
            value={String(values[key] ?? '')}
            onChange={(e) => {
              update(
                key,
                key === 'weekday' ? Number(e.target.value) : e.target.value,
              );
              if (key === 'entity') {
                update('entity_id', '');
                update('fields', {});
              }
            }}
          >
            <option value="">
              {f.nullable
                ? key === 'resource_id'
                  ? 'Tout le salon'
                  : 'Aucun'
                : 'Choisir'}
            </option>
            {(key === 'weekday'
              ? weekdays.map((name, i) => ({ value: String(i), label: name }))
              : f.ref
                ? (refs[f.ref] ?? []).map((r) => ({
                    value: String(r.id),
                    label: String(r.name ?? 'Élément indisponible'),
                  }))
                : (f.options ?? [])
            ).map((o) => (
              <option key={o.value} value={o.value}>
                {promotion && key === 'kind' && o.value === 'fixed'
                  ? 'Montant fixe'
                  : (options[o.value] ?? o.label)}
              </option>
            ))}
          </select>
        </label>
      );
    if (key === 'key')
      return (
        <label key={key}>
          Texte à modifier
          <select
            value={String(values.key ?? '')}
            required
            onChange={(e) => update('key', e.target.value)}
          >
            <option value="">Choisir une section</option>
            {[
              ['premium.beautyHouse', 'Accueil : introduction'],
              ['premium.universes', 'Accueil : titre des catégories'],
              [
                'premium.universesBody',
                'Accueil : présentation des catégories',
              ],
              ['premium.aboutTitle', 'Présentation du salon : titre'],
              ['about.philosophy.listen', 'À propos : écoute'],
              ['about.philosophy.beauty', 'À propos : beauté'],
              ['about.philosophy.wellbeing', 'À propos : bien-être'],
              ['about.introduction', 'À propos : paragraphe de présentation'],
              ['home.services.title', 'Prestations : titre'],
              ...(edit?.key ? [[String(edit.key), 'Section existante']] : []),
            ].map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
      );
    if (f.type === 'textarea')
      return (
        <label key={key}>
          {label}
          <textarea
            rows={4}
            value={String(values[key] ?? '')}
            onChange={(e) => update(key, e.target.value)}
          />
        </label>
      );
    return (
      <label key={key} data-field={key}>
        {label}
        <input
          type={f.type}
          min={monetary(key, values) ? 0 : f.min}
          max={monetary(key, values) ? 1000000 : f.max}
          step={
            monetary(key, values)
              ? '0.01'
              : f.type === 'number'
                ? '1'
                : undefined
          }
          value={String(values[key] ?? '')}
          disabled={
            key === 'price_minor' && values.price_type === 'consultation'
          }
          required={
            !f.nullable &&
            [
              'name',
              'title',
              'reason',
              'alt',
              'duration_minutes',
              'opens',
              'closes',
              'starts_at',
              'ends_at',
              'day',
            ].includes(key)
          }
          onChange={(e) =>
            update(
              key,
              f.type === 'number' && !monetary(key, values)
                ? e.target.value === ''
                  ? ''
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
        {f.type === 'datetime-local' && <small>{timezone}</small>}
      </label>
    );
  }
  const visibleFields = config.fields.filter(
    (f) =>
      !['slug'].includes(f.key) &&
      !(['exceptions', 'closures'].includes(slug) && f.key === 'resource_id') &&
      !(faq && f.key === 'key') &&
      !((employee || slug === 'equipment') && f.key === 'kind') &&
      (!settings ||
        (view === 'photos'
          ? photoFields.includes(f.key)
          : view === 'website'
            ? websiteFields.includes(f.key)
            : view === 'policies'
              ? policyFields.includes(f.key)
              : view === 'advanced'
                ? ![...infoFields, ...websiteFields, ...photoFields].includes(
                    f.key,
                  )
                : infoFields.includes(f.key))),
  );
  const isAdvanced = (key: string) =>
    advancedFields.includes(key) ||
    (settings && key === 'map_url') ||
    (slug === 'services' && ['description', 'image_path'].includes(key));
  const primary = visibleFields.filter((f) => !isAdvanced(f.key));
  const advanced = visibleFields.filter((f) => isAdvanced(f.key));
  const offerStatus = (row: Row) =>
    ({
      Active: 'En cours',
      Programmée: 'À venir',
      Expirée: 'Terminée',
      Épuisée: 'Épuisée',
      Désactivée: 'Désactivée',
    })[
      promotionState(
        row as { active: unknown; starts_at: unknown; ends_at: unknown },
      )
    ] ?? 'Désactivée';
  const fold = (value: string) =>
    value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
  const shownRows = (settings ? [] : rows).filter(
    (row) =>
      fold(
        slug === 'services' ? String(row.name ?? '') : JSON.stringify(row),
      ).includes(fold(query)) &&
      (!categoryFilter || row.category_id === categoryFilter) &&
      (!promotion ||
        offerFilter === 'Toutes' ||
        offerStatus(row) === offerFilter),
  );
  return (
    <div
      className="salon-entity-workspace"
      data-entity={slug}
      data-editing={open}
    >
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {affected.length > 0 && (
        <div className="notice">
          Rendez-vous à vérifier :{' '}
          {affected.map((a) => (
            <Link
              key={a.reference}
              href={`/admin/bookings?reference=${a.reference}`}
            >
              {a.reference}{' '}
            </Link>
          ))}
        </div>
      )}
      {['locations', 'service-cities', 'city-hours'].includes(slug) && (
        <p className="notice">
          Les villes et leurs horaires complètent les horaires du salon et de
          l’équipe. Les frais de déplacement existants restent appliqués.
        </p>
      )}
      {settings && !open && (
        <button className="button secondary" onClick={() => openForm(rows[0])}>
          Modifier
        </button>
      )}
      {!settings && (
        <div className="admin-toolbar">
          {slug === 'services' && (
            <label>
              Filtrer par catégorie
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  searchServices(e.target.value);
                }}
              >
                <option value="">Toutes les catégories</option>
                {(refs.categories ?? []).map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {slug === 'services'
              ? 'Rechercher une prestation'
              : promotion
                ? 'Rechercher une offre'
                : 'Rechercher sur cette page'}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && slug === 'services') {
                  e.preventDefault();
                  searchServices();
                }
              }}
            />
          </label>
          {slug === 'services' && !onSave && (
            <button
              className="button secondary"
              type="button"
              onClick={() => searchServices()}
            >
              Rechercher
            </button>
          )}
          <button
            className="button"
            onClick={() => openForm(settings ? rows[0] : undefined)}
          >
            {settings
              ? 'Modifier'
              : promotion
                ? 'Créer une offre'
                : employee
                  ? 'Ajouter une employée'
                  : slug === 'services'
                    ? 'Ajouter une prestation'
                    : 'Ajouter'}
          </button>
          {slug === 'services' && (
            <Link
              className="button secondary"
              href={
                onSave
                  ? '/admin/preview?section=categories'
                  : '/admin/categories'
              }
            >
              Gérer les catégories
            </Link>
          )}
        </div>
      )}
      {promotion && (
        <div
          className="salon-offer-filters"
          role="group"
          aria-label="Statut des offres"
        >
          {['Toutes', 'En cours', 'À venir', 'Terminée', 'Désactivée'].map(
            (status) => (
              <button
                key={status}
                type="button"
                aria-pressed={offerFilter === status}
                onClick={() => setOfferFilter(status)}
              >
                {status === 'Terminée'
                  ? 'Terminées'
                  : status === 'Désactivée'
                    ? 'Désactivées'
                    : status}
              </button>
            ),
          )}
        </div>
      )}
      {open && (
        <form className="admin-form" onSubmit={save}>
          <h2>
            {settings
              ? view === 'photos'
                ? 'Images de votre site'
                : view === 'website'
                  ? 'Textes de l’accueil'
                  : view === 'policies'
                    ? 'Conditions et réservation'
                    : view === 'advanced'
                      ? 'Réglages avancés'
                      : 'Informations du salon'
              : edit
                ? slug === 'services'
                  ? 'Modifier la prestation'
                  : promotion
                    ? 'Modifier l’offre'
                    : 'Modifier'
                : promotion
                  ? 'Créer une offre'
                  : slug === 'services'
                    ? 'Ajouter une prestation'
                    : 'Ajouter'}
          </h2>
          <fieldset disabled={busy}>
            <div className="form-grid">{primary.map(field)}</div>
            {(promotion || employee) && (
              <fieldset className="salon-choice-group">
                <legend>
                  {promotion
                    ? 'Prestations concernées'
                    : 'Prestations réalisées'}
                </legend>
                {!(refs.services ?? []).length && (
                  <p>Ajoutez d’abord vos prestations dans le catalogue.</p>
                )}
                {(refs.services ?? []).map((s) => (
                  <label className="checkbox-label" key={String(s.id)}>
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(String(s.id))}
                      onChange={(e) => {
                        setSelectedServices((ids) =>
                          e.target.checked
                            ? [...ids, String(s.id)]
                            : ids.filter((id) => id !== s.id),
                        );
                      }}
                    />
                    {String(s.name)}
                  </label>
                ))}
              </fieldset>
            )}
            {employee && (
              <fieldset className="salon-choice-group">
                <legend>Jours et heures de travail</legend>
                <p className="small">
                  Chaque plage doit aussi respecter les horaires du salon.
                  Ajoutez deux plages pour prévoir une pause.
                </p>
                {hours.map((h, i) => (
                  <div className="salon-hour" key={i}>
                    <label>
                      Jour
                      <select
                        value={h.weekday}
                        onChange={(e) =>
                          setHours((old) =>
                            old.map((v, n) =>
                              n === i
                                ? { ...v, weekday: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      >
                        {weekdays.map((d, n) => (
                          <option key={d} value={n}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Ouverture
                      <input
                        type="time"
                        value={h.opens}
                        required
                        onChange={(e) =>
                          setHours((old) =>
                            old.map((v, n) =>
                              n === i ? { ...v, opens: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Fermeture
                      <input
                        type="time"
                        value={h.closes}
                        required
                        onChange={(e) =>
                          setHours((old) =>
                            old.map((v, n) =>
                              n === i ? { ...v, closes: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        setHours((old) => old.filter((_, n) => n !== i));
                      }}
                    >
                      Retirer cette plage
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setHours((old) => [
                      ...old,
                      { weekday: 1, opens: '', closes: '' },
                    ]);
                  }}
                >
                  Ajouter une plage horaire
                </button>
              </fieldset>
            )}
            {advanced.length > 0 && (
              <details className="salon-disclosure">
                <summary>Paramètres avancés</summary>
                <div className="form-grid">{advanced.map(field)}</div>
              </details>
            )}
            {slug === 'services' && (
              <p className="small">
                Les prix et durées peuvent être renseignés lorsqu’ils sont
                connus. L’agenda manuel enregistre uniquement l’heure de début.
              </p>
            )}
            <div className="inline-actions">
              <button
                className="button"
                disabled={busy || (config.table === 'gallery' && !values.path)}
              >
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <div className="admin-record-grid">
        {slug === 'services' && (
          <div className="salon-service-columns" aria-hidden="true">
            <span>Prestation</span>
            <span>Catégorie</span>
            <span>Prix</span>
            <span>Sur le site</span>
            <span>Action</span>
          </div>
        )}
        {shownRows.map((row) => (
          <article className="admin-record-card" key={String(row.id)}>
            {slug === 'services' && (
              <span className="salon-service-icon">
                <AdminIcon name="services" />
              </span>
            )}
            {promotion && (
              <Image
                className="salon-offer-image"
                src={`/images/premium/${/coiff|cheveu|hair/i.test(String(row.name)) ? 'bridal-hair' : /caftan|location/i.test(String(row.name)) ? 'occasion-caftan' : 'ritual-care'}-720.webp`}
                alt="Illustration d’ambiance"
                width={360}
                height={300}
              />
            )}
            {config.table === 'gallery' && row.path && !onSave ? (
              <Image
                className="salon-record-photo"
                unoptimized
                src={salonImage(String(row.path))}
                alt={String(row.alt ?? 'Photo du salon')}
                width={320}
                height={200}
              />
            ) : null}
            <h3>
              {String(
                row.name ??
                  row.title ??
                  (config.table === 'working_hours' ||
                  config.table === 'city_hours'
                    ? weekdays[Number(row.weekday)]
                    : config.table === 'closures'
                      ? row.reason
                      : 'Fiche du salon'),
              )}
            </h3>
            {promotion ? (
              <>
                <span className="badge">{offerStatus(row)}</span>
                <p className="salon-offer-discount">
                  {row.kind === 'percentage'
                    ? `${row.value} %`
                    : money(Number(row.value))}{' '}
                  de réduction
                </p>
                <span className="badge">
                  {row.audience === 'members'
                    ? 'Réservée aux clientes inscrites'
                    : 'Pour toutes les clientes'}
                </span>
                <p className="salon-offer-dates">
                  {date(String(row.starts_at), { timeZone: timezone })} →{' '}
                  {date(String(row.ends_at), { timeZone: timezone })}
                </p>
                <p>
                  {(refs.promotion_services ?? [])
                    .filter((r) => r.promotion_id === row.id)
                    .map(
                      (r) =>
                        refs.services?.find((s) => s.id === r.service_id)?.name,
                    )
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </>
            ) : slug === 'services' ? (
              <>
                <span className="salon-service-category">
                  {String(
                    refs.categories?.find((c) => c.id === row.category_id)
                      ?.name ?? 'Sans catégorie',
                  )}
                </span>
                <span className="salon-service-price">
                  {row.price_minor == null || row.price_type === 'consultation'
                    ? 'Sur demande'
                    : `${row.price_type === 'starting' ? 'À partir de ' : ''}${money(Number(row.price_minor))}`}
                </span>
                <span
                  className={`badge ${row.published && !row.archived ? 'badge-confirmed' : ''}`}
                >
                  {row.published && !row.archived ? 'Active' : 'Désactivée'}
                </span>
              </>
            ) : (
              <dl>
                {config.fields
                  .filter(
                    (f) =>
                      ![
                        'slug',
                        'key',
                        'fields',
                        'entity_id',
                        ...imageFields,
                      ].includes(f.key) &&
                      !(
                        ['exceptions', 'closures'].includes(slug) &&
                        f.key === 'resource_id'
                      ) &&
                      f.type !== 'textarea' &&
                      f.key !== 'name' &&
                      (!settings ||
                        visibleFields.some((v) => v.key === f.key)) &&
                      (!advancedFields.includes(f.key) ||
                        (f.key === 'archived' && row.archived)) &&
                      !((employee || slug === 'equipment') && f.key === 'kind'),
                  )
                  .map((f) => (
                    <div key={f.key}>
                      <dt>{labels[f.key] ?? t(f.label)}</dt>
                      <dd>
                        {f.key === 'weekday'
                          ? weekdays[Number(row[f.key])]
                          : f.type === 'checkbox'
                            ? row[f.key]
                              ? 'Oui'
                              : 'Non'
                            : f.ref
                              ? String(
                                  refs[f.ref]?.find((r) => r.id === row[f.key])
                                    ?.name ?? 'Tout le salon',
                                )
                              : monetary(f.key, row)
                                ? row[f.key] == null
                                  ? 'Sur demande'
                                  : money(Number(row[f.key]))
                                : (options[String(row[f.key])] ??
                                  String(row[f.key] ?? '—'))}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
            {employee && (
              <p>
                {(refs.qualifications ?? [])
                  .filter((q) => q.resource_id === row.id)
                  .map(
                    (q) =>
                      refs.services?.find((s) => s.id === q.service_id)?.name,
                  )
                  .filter(Boolean)
                  .join(' · ') || 'Aucune prestation attribuée'}
              </p>
            )}
            {config.table === 'services' ||
            (['categories', 'promotions'].includes(config.table) && !onSave) ? (
              <div className="permanent-record-actions">
                <button
                  className="button secondary"
                  onClick={() => openForm(row)}
                >
                  Modifier
                </button>
                {config.table === 'services' && (
                  <ServiceStatus
                    id={String(row.id)}
                    name={String(row.name ?? row.id)}
                    active={Boolean(row.published && !row.archived)}
                    onChange={
                      onSave
                        ? async (active) =>
                            onSave({
                              ...row,
                              published: active,
                              ...(active ? { archived: false } : {}),
                            })
                        : undefined
                    }
                  />
                )}
                {!onSave &&
                  (config.table !== 'services' ||
                    !row.published ||
                    Boolean(row.archived)) && (
                    <PermanentDelete
                      entity={config.table}
                      id={String(row.id)}
                      name={String(row.name ?? row.id)}
                    />
                  )}
              </div>
            ) : (
              <button
                className="button secondary"
                onClick={() => openForm(row)}
              >
                Modifier
              </button>
            )}
            {config.table === 'gallery' && !onSave && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api('/api/admin/settings', {
                      id: 1,
                      hero_image_path: row.path,
                    });
                    setMessage('Photo d’accueil enregistrée.');
                    router.refresh();
                  } catch (error) {
                    fail(error);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Utiliser en photo d’accueil
              </button>
            )}
            {config.deletable && (
              <button
                className="button secondary"
                onClick={() => setRemove(String(row.id))}
              >
                Supprimer
              </button>
            )}
            {remove === row.id && (
              <div className="notice">
                <p>
                  Supprimer cet élément ? Cette action peut modifier les
                  disponibilités. Les photos déjà envoyées restent dans le
                  stockage.
                </p>
                <button
                  className="button secondary"
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
                  Confirmer la suppression
                </button>
                <button onClick={() => setRemove(null)}>Conserver</button>
              </div>
            )}
            {config.table === 'customers' && !onSave && (
              <CustomerPrivacy id={String(row.id)} />
            )}
          </article>
        ))}
      </div>
      {settings && !view && (
        <aside className="salon-settings-preview">
          <h2>
            <AdminIcon name="photos" /> Aperçu sur le site
          </h2>
          {rows[0]?.hero_image_path ? (
            <Image
              src={salonImage(String(rows[0].hero_image_path))}
              alt="Image d’accueil actuellement enregistrée"
              width={700}
              height={350}
              unoptimized
            />
          ) : (
            <div className="salon-preview-placeholder">
              <AdminIcon name="photos" />
              <span>Votre photo d’accueil se gère dans Photos.</span>
            </div>
          )}
          <h3>{String(values.name ?? 'Votre salon')}</h3>
          <div className="salon-preview-contact">
            {['address', 'phone', 'whatsapp', 'email', 'instagram']
              .filter((key) => !!values[key])
              .map((key) => (
                <p key={key}>{String(values[key])}</p>
              ))}
          </div>
          {!!values.about && (
            <p className="salon-preview-description">{String(values.about)}</p>
          )}
          <Link className="button secondary" href="/">
            Voir le site ↗
          </Link>
          <p className="notice">
            Vos modifications apparaissent sur le site après enregistrement.
          </p>
        </aside>
      )}
      {!settings && !shownRows.length && (
        <p className="empty-state">
          Aucun élément pour le moment. Utilisez le bouton Ajouter pour
          commencer.
        </p>
      )}
    </div>
  );
}
