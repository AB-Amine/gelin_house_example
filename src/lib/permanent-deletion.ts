export type DeletionInfo = {
  entity: string;
  id: string;
  name: string;
  fingerprint: string;
  eligible: boolean;
  deletionEnabled?: boolean;
  expanded?: boolean;
  affected?: {
    table: string;
    count: number;
    rows: { id: string; label: string }[];
  }[];
  preserved?: string[];
  notices?: string[];
  requiresDependenciesConfirmation?: boolean;
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
// Legacy RPC map while the expanded proposal awaits production approval.
// Both versions derive administrator identity from the verified session.
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
  code?: string;
}): DeletionBlocked {
  if (error.code === '55P03' || error.code === '40P01')
    return new DeletionBlocked(
      'Un élément associé est en cours de modification. Aucune suppression n’a été validée ; actualisez puis réessayez.',
    );
  if (error.code === '57014')
    return new DeletionBlocked(
      'L’opération a dépassé le délai autorisé. Aucune suppression n’a été validée. Actualisez le récapitulatif avant de réessayer.',
    );
  if (error.code === '23503')
    return new DeletionBlocked(
      'Une relation supplémentaire empêche cette suppression. Aucune modification n’a été validée ; actualisez le récapitulatif avant de réessayer.',
    );
  if (error.code === '42501')
    return new DeletionBlocked(
      'Les autorisations nécessaires à cette opération ne sont pas activées en base de données. Aucun élément n’a été supprimé.',
      403,
    );
  if (error.code === 'PGRST202' || error.code === '42883')
    return new DeletionBlocked(
      'La vérification de suppression n’est pas disponible sur ce site. Contactez l’administrateur.',
      503,
    );
  const messages: Record<string, [string, number]> = {
    GH_ADMIN_ACCOUNT_PROTECTED: [
      'Les comptes administrateurs, y compris votre propre compte et le dernier administrateur actif, sont protégés.',
      409,
    ],
    GH_DEPENDENCY_CONFIRMATION: [
      'Confirmez explicitement le traitement des éléments associés indiqués dans le récapitulatif.',
      400,
    ],
    GH_RELATED_RECORD_DELETED: [
      'Un élément associé a été supprimé. Actualisez avant de réessayer.',
      409,
    ],
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
