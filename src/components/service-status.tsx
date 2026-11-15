'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
export function ServiceStatus({
  id,
  name,
  active,
  onChange,
}: {
  id: string;
  name: string;
  active: boolean;
  onChange?: (active: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const guard = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const next = !active;
  return (
    <>
      <button
        type="button"
        className="button secondary"
        onClick={() => {
          setMessage('');
          dialog.current?.showModal();
          cancel.current?.focus();
        }}
      >
        {active ? 'Désactiver' : 'Activer'}
      </button>
      <dialog
        ref={dialog}
        className="permanent-delete-dialog"
        aria-labelledby={`service-status-${id}`}
        onCancel={(e) => {
          if (guard.current) e.preventDefault();
        }}
      >
        <h2 id={`service-status-${id}`}>
          {active ? 'Désactiver' : 'Activer'} la prestation
        </h2>
        <p>
          <strong>{name}</strong>
        </p>
        <p>
          {active
            ? 'La prestation sera masquée du catalogue public et refusée pour les nouvelles réservations. Ses rendez-vous, demandes, clientes et historiques restent conservés. Vous pourrez la réactiver.'
            : 'La prestation sera republiée et désarchivée. Les règles habituelles de réservation, de catégorie et de disponibilité restent applicables.'}
        </p>
        <p role="status">{message}</p>
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
            Annuler
          </button>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={async () => {
              if (guard.current) return;
              guard.current = true;
              setBusy(true);
              try {
                if (onChange) await onChange(next);
                else {
                  const result = await api<{
                    saved: boolean;
                    id: string;
                    active: boolean;
                  }>('/api/admin/service-status', {
                    id,
                    active: next,
                    confirmation: 'CONFIRMER',
                  });
                  if (
                    !result.saved ||
                    result.id !== id ||
                    result.active !== next
                  )
                    throw Error('Modification non confirmée.');
                  router.refresh();
                }
                dialog.current?.close();
              } catch (e) {
                setMessage(errorMessage(e));
              } finally {
                guard.current = false;
                setBusy(false);
              }
            }}
          >
            {busy
              ? 'Enregistrement…'
              : active
                ? 'Confirmer la désactivation'
                : 'Confirmer l’activation'}
          </button>
        </div>
      </dialog>
    </>
  );
}
