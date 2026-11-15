'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
import type { DeletionInfo } from '@/lib/permanent-deletion';

export function PermanentDelete({
  entity,
  id,
  name,
}: {
  entity: string;
  id: string;
  name: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const guard = useRef(false);
  const router = useRouter();
  const [info, setInfo] = useState<DeletionInfo | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleted, setDeleted] = useState(false);
  const request = (mode: string, extra = {}) =>
    api<DeletionInfo & { deleted?: boolean }>('/api/admin/permanent-deletion', {
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
        onClick={async () => {
          if (guard.current) return;
          guard.current = true;
          setBusy(true);
          setInfo(null);
          setMessage('');
          setConfirmation('');
          setDeleted(false);
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
        Supprimer
      </button>
      <dialog
        ref={dialog}
        className="permanent-delete-dialog"
        aria-labelledby={`delete-title-${id}`}
        onClose={() => {
          if (deleted) router.refresh();
        }}
        onCancel={(e) => {
          if (guard.current) e.preventDefault();
        }}
      >
        <h2 id={`delete-title-${id}`}>Suppression définitive</h2>
        <p>
          <strong>{info?.name ?? name}</strong>
        </p>
        <p>
          Cette action est irréversible. Les éléments associés indiqués
          ci-dessous seront également supprimés. Les fichiers image restent dans
          le stockage.
        </p>
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
            Statut : {info.details.status}
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
        {info?.reasons.map((reason) => (
          <p key={reason} className="error">
            {reason}
          </p>
        ))}
        {entity === 'clients' && (
          <p>
            Le compte Auth et le profil doivent être traités ensemble ; aucune
            suppression partielle n’est permise.
          </p>
        )}
        {info?.eligible && (
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
            {deleted ? 'Fermer' : 'Annuler'}
          </button>
          <button
            type="button"
            className="button"
            disabled={busy || !info?.eligible || confirmation !== 'SUPPRIMER'}
            onClick={async () => {
              if (guard.current || !info) return;
              guard.current = true;
              setBusy(true);
              try {
                const result = await request('delete', {
                  fingerprint: info.fingerprint,
                  confirmation,
                });
                if (!result.deleted) throw Error('Suppression non confirmée.');
                setMessage('Suppression définitive effectuée.');
                setInfo(null);
                setDeleted(true);
              } catch (e) {
                setMessage(errorMessage(e));
                setInfo(null);
              } finally {
                setBusy(false);
                guard.current = false;
              }
            }}
          >
            {busy ? 'Traitement…' : 'Confirmer la suppression'}
          </button>
        </div>
      </dialog>
    </>
  );
}
