'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
export type AccountDeletionJob = {
  jobId: string;
  id: string;
  name: string;
  state: string;
};
export function AccountDeletionJobs({ jobs }: { jobs: AccountDeletionJob[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  if (!jobs.length && !message) return null;
  if (!jobs.length)
    return (
      <p className="notice" role="status">
        {message}
      </p>
    );
  return (
    <section className="notice">
      <h2>Suppressions de comptes à terminer</h2>
      <p>
        Les données de l’application ont déjà été supprimées. Le compte de
        connexion reste à supprimer ou à vérifier.
      </p>
      {jobs.map((job) => (
        <div key={job.jobId}>
          <p>{job.name || 'Compte cliente'}</p>
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={async () => {
              setBusy(job.jobId);
              setMessage('');
              try {
                const result = await api<{
                  deleted: boolean;
                  id: string;
                  message?: string;
                }>('/api/admin/permanent-deletion', {
                  entity: 'clients',
                  id: job.id,
                  mode: 'retry',
                  jobId: job.jobId,
                });
                setMessage(
                  result.deleted && result.id === job.id
                    ? 'Le compte a été supprimé définitivement.'
                    : (result.message ??
                        'La suppression du compte reste en attente.'),
                );
                router.refresh();
              } catch (error) {
                setMessage(errorMessage(error));
              } finally {
                setBusy('');
              }
            }}
          >
            {busy === job.jobId ? 'Vérification…' : 'Terminer la suppression'}
          </button>
        </div>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
