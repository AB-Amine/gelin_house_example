export type DeletionInfo = {
  entity: string;
  id: string;
  name: string;
  fingerprint: string;
  eligible: boolean;
  reasons: string[];
  owned: { table: string; count: number }[];
  details: {
    reference?: string;
    starts_at?: string;
    status?: string;
    customer?: string;
    services?: string[];
  };
};
export class DeletionBlocked extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
// No actor argument: the database derives identity from the verified JWT.
export const deletionFunctions = {
  services: { preview: 'gelin_preview_service', delete: null },
  categories: {
    preview: 'gelin_preview_category',
    delete: 'gelin_delete_category',
  },
  promotions: { preview: 'gelin_preview_offer', delete: 'gelin_delete_offer' },
  appointments: {
    preview: 'gelin_preview_appointment',
    delete: 'gelin_delete_appointment',
  },
} as const;
export function deletionFailure(error: {
  message: string;
  details?: string;
}): DeletionBlocked {
  const messages: Record<string, [string, number]> = {
    GH_FORBIDDEN: ['Accès non autorisé ou session expirée.', 403],
    GH_NOT_FOUND: ['Cet élément est introuvable ou déjà supprimé.', 404],
    GH_CONFIRMATION: ['Confirmation explicite requise.', 400],
    GH_CHANGED: [
      'La fiche a changé. Fermez puis ouvrez une nouvelle confirmation.',
      409,
    ],
  };
  if (error.message === 'GH_DELETE_BLOCKED') {
    try {
      const reasons: unknown = JSON.parse(error.details ?? '');
      if (
        Array.isArray(reasons) &&
        reasons.every((r) => typeof r === 'string' && r.length < 500)
      )
        return new DeletionBlocked(reasons.join(' '));
    } catch {
      /* Do not expose raw diagnostics. */
    }
  }
  const known = messages[error.message];
  return new DeletionBlocked(
    known?.[0] ??
      'Suppression non confirmée. Vérifiez les dépendances et la disponibilité des fonctions approuvées.',
    known?.[1] ?? 409,
  );
}
