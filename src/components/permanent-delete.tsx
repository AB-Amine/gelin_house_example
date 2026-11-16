'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
import type { DeletionInfo } from '@/lib/permanent-deletion';
import { useI18n } from './locale-provider';

export function PermanentDelete({
  entity,
  id,
  name,
  triggerLabel = 'Supprimer',
  onDeleted,
}: {
  entity: string;
  id: string;
  name: string;
  triggerLabel?: string;
  onDeleted?: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const guard = useRef(false);
  const router = useRouter();
  const [info, setInfo] = useState<DeletionInfo | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [dependentsConfirmed, setDependentsConfirmed] = useState(false);
  const canDelete = info?.eligible && info.deletionEnabled === true;
  const request = (mode: string, extra = {}) =>
    api<
      DeletionInfo & { deleted?: boolean; pending?: boolean; message?: string }
    >('/api/admin/permanent-deletion', {
      entity,
      id,
      mode,
      ...extra,
    });
  return (
    <>
      <button
        type="button"
        className="button secondary"
        disabled={deleted}
        onClick={async () => {
          if (guard.current) return;
          guard.current = true;
          setBusy(true);
          setInfo(null);
          setMessage('');
          setConfirmation('');
          setDeleted(false);
          setDependentsConfirmed(false);
          dialog.current?.showModal();
          cancel.current?.focus();
          try {
            setInfo(await request('preview'));
          } catch (e) {
            setMessage(errorMessage(e));
          } finally {
            setBusy(false);
            guard.current = false;
          }
        }}
      >
        {deleted ? 'Supprimé' : triggerLabel}
      </button>
      <dialog
        ref={dialog}
        className="permanent-delete-dialog"
        aria-labelledby={`delete-title-${id}`}
        onCancel={(e) => {
          if (guard.current) e.preventDefault();
        }}
      >
        <h2 id={`delete-title-${id}`}>Suppression définitive</h2>
        <p>
          <strong>{info?.name ?? name}</strong>
        </p>
        <p>Type : {deletionLabels[entity] ?? entity}</p>
        <p>
          {canDelete
            ? 'Êtes-vous sûr de vouloir supprimer définitivement cet élément ? Cette action est irréversible.'
            : 'Cette vérification ne modifie aucun élément et ne supprime aucun rendez-vous.'}
        </p>
        {info && !info.deletionEnabled && (
          <p role="status">
            La vérification est disponible. La suppression définitive est
            désactivée sur ce site ; aucune suppression n’est autorisée.
          </p>
        )}
        {info && !info.eligible && (
          <p>
            Cette fiche ne peut pas être supprimée définitivement pour les
            raisons suivantes.
          </p>
        )}
        {info?.eligible && (
          <p>
            Aucune dépendance bloquante détectée lors de cette vérification.
          </p>
        )}
        {info?.details.reference && (
          <p>
            {info.details.reference} · {info.details.customer}
            <br />
            {new Intl.DateTimeFormat('fr-MA', {
              timeZone: 'Africa/Casablanca',
              dateStyle: 'full',
              timeStyle: 'short',
            }).format(new Date(info.details.starts_at!))}
            <br />
            Statut : {t(`status.${info.details.status}`)}
            <br />
            {info.details.services?.join(' · ')}
          </p>
        )}
        {info?.owned.some((c) => c.count > 0) && (
          <ul>
            {info.owned
              .filter((c) => c.count > 0)
              .map((c) => (
                <li key={c.table}>
                  {c.table} : {c.count}
                </li>
              ))}
          </ul>
        )}
        {info?.notices?.map((text) => (
          <p key={text} className="notice">
            {text}
          </p>
        ))}
        {info?.affected?.map((group) => (
          <details key={group.table}>
            <summary>
              {deletionLabels[group.table] ?? 'Éléments associés'} :{' '}
              {group.count} à supprimer
            </summary>
            <ul>
              {group.rows.map((row) => (
                <li key={row.id}>
                  {row.label} <small>({row.id})</small>
                </li>
              ))}
            </ul>
          </details>
        ))}
        {info?.preserved?.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {info?.reasons.map((reason) => (
          <p key={reason} className="error">
            {reason}
          </p>
        ))}
        {entity === 'clients' && (
          <p>
            Les données de l’application et le compte de connexion sont
            supprimés en deux étapes distinctes. En cas d’interruption, une
            action « Terminer la suppression » restera disponible dans Clientes
            inscrites.
          </p>
        )}
        {canDelete && (
          <label>
            Pour confirmer, saisissez SUPPRIMER
            <input
              autoComplete="off"
              value={confirmation}
              disabled={busy}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
        )}
        {canDelete && info.requiresDependenciesConfirmation && (
          <label>
            <input
              type="checkbox"
              checked={dependentsConfirmed}
              disabled={busy}
              onChange={(event) => setDependentsConfirmed(event.target.checked)}
            />
            Je confirme également la suppression de tous les éléments associés
            répertoriés ci-dessus.
          </label>
        )}
        <p role="status" aria-live="polite">
          {busy ? 'Vérification en cours…' : message}
        </p>
        <div className="inline-actions">
          <button
            type="button"
            ref={cancel}
            className="button secondary"
            aria-disabled={busy}
            onClick={() => {
              if (!guard.current) dialog.current?.close();
            }}
          >
            {canDelete && !deleted ? 'Annuler' : 'Fermer'}
          </button>
          {canDelete && (
            <button
              type="button"
              className="button"
              disabled={
                busy ||
                confirmation !== 'SUPPRIMER' ||
                (info.requiresDependenciesConfirmation && !dependentsConfirmed)
              }
              onClick={async () => {
                if (
                  guard.current ||
                  !info ||
                  !canDelete ||
                  (info.requiresDependenciesConfirmation &&
                    !dependentsConfirmed)
                )
                  return;
                guard.current = true;
                setBusy(true);
                try {
                  const result = await request('delete', {
                    fingerprint: info.fingerprint,
                    confirmation,
                    dependentsConfirmed,
                  });
                  if (result.pending && result.id === id) {
                    setMessage(
                      result.message ??
                        'La suppression du compte de connexion reste à terminer dans Clientes inscrites.',
                    );
                    setInfo(null);
                    router.refresh();
                    return;
                  }
                  if (!result.deleted || result.id !== id)
                    throw Error('Suppression non confirmée.');
                  setMessage('Suppression définitive effectuée.');
                  setInfo(null);
                  setDeleted(true);
                  onDeleted?.();
                  router.refresh();
                } catch (e) {
                  setMessage(errorMessage(e));
                  setInfo(null);
                } finally {
                  setBusy(false);
                  guard.current = false;
                }
              }}
            >
              {busy ? 'Traitement…' : 'Supprimer définitivement'}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}

const deletionLabels: Record<string, string> = {
  services: 'Prestations',
  categories: 'Catégories',
  promotions: 'Offres',
  appointments: 'Rendez-vous',
  clients: 'Compte cliente',
  appointment_items: 'Prestations réservées',
  allocations: 'Créneaux réservés',
  appointment_history: 'Historique des rendez-vous',
  contact_messages: 'Messages et demandes',
  change_requests: 'Demandes de modification',
  payment_records: 'Écritures financières',
  notification_outbox: 'Notifications',
  promotion_services: 'Liens entre offres et prestations',
  qualifications: 'Qualifications',
  service_resources: 'Équipements associés',
  service_cities: 'Lieux associés',
  translations: 'Traductions',
  customers: 'Coordonnées des réservations',
  client_profiles: 'Profil cliente',
  'auth.users': 'Compte de connexion',
};
