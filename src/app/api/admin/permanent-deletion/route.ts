import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { body, failure, ok, sameOrigin } from '@/lib/http';
import { sessionDb } from '@/lib/supabase';
import {
  DeletionBlocked,
  deletionFunctions,
  deletionFailure,
} from '@/lib/permanent-deletion';
import { revalidatePath } from 'next/cache';
import { finishAccountDeletion } from '@/lib/account-deletion';
export const runtime = 'nodejs';
const schema = z
  .object({
    entity: z.enum([
      'services',
      'categories',
      'promotions',
      'appointments',
      'clients',
    ]),
    id: z.uuid(),
    mode: z.enum(['preview', 'delete', 'retry']),
    jobId: z.uuid().optional(),
    dependentsConfirmed: z.boolean().optional(),
    fingerprint: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    confirmation: z.string().max(200).optional(),
  })
  .strict();
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const staff = await requireStaff();
    const input = schema.parse(await body(req, 2000));
    const expanded = process.env.EXPANDED_DELETION_ENABLED === 'true';
    // Keep legacy deployments compatible; expanded SQL checks all admin identities.
    if (input.entity === 'clients' && (input.id === staff.id || !expanded))
      throw new DeletionBlocked(
        input.id === staff.id
          ? 'Votre compte administrateur est protégé.'
          : 'La suppression complète des comptes nécessite la mise à jour approuvée de ce site. Aucun compte ni profil n’a été supprimé.',
      );
    if (!expanded && input.entity === 'services' && input.mode === 'delete')
      throw new DeletionBlocked(
        'La suppression des prestations nécessite la mise à jour complète approuvée du site. Aucune prestation n’a été supprimée.',
      );
    const deletionEnabled = process.env.PERMANENT_DELETION_ENABLED === 'true';
    // Read-only previews remain useful while destructive execution is disabled.
    if (input.mode !== 'preview' && !deletionEnabled)
      throw new DeletionBlocked(
        'La suppression définitive est désactivée sur ce site. La vérification des conditions reste disponible ; aucun élément ne sera supprimé.',
        503,
      );
    const db = await sessionDb();
    if (input.mode === 'retry') {
      if (!expanded || input.entity !== 'clients' || !input.jobId)
        throw new DeletionBlocked(
          'Reprise de suppression non disponible.',
          400,
        );
      const jobs = await db.rpc('gelin_account_deletion_jobs');
      if (jobs.error) throw deletionFailure(jobs.error);
      if (
        !Array.isArray(jobs.data) ||
        !jobs.data.some(
          (job) => job.jobId === input.jobId && job.id === input.id,
        )
      )
        throw new DeletionBlocked('Suppression en attente introuvable.', 404);
      const result = await finishAccountDeletion(input.id, input.jobId);
      revalidatePath('/admin', 'layout');
      return ok(result);
    }
    const functions =
      input.entity === 'clients' ? null : deletionFunctions[input.entity];
    const fn = expanded
      ? input.mode === 'preview'
        ? 'gelin_crud_preview'
        : 'gelin_crud_delete'
      : functions?.[input.mode];
    if (!fn) throw new DeletionBlocked('Cette suppression reste bloquée.');
    if (
      input.mode === 'delete' &&
      (!input.fingerprint || input.confirmation !== 'SUPPRIMER')
    )
      throw new DeletionBlocked('Confirmation requise.', 400);
    const { data: result, error } = await db.rpc(fn, {
      p_id: input.id,
      ...(expanded ? { p_kind: input.entity } : {}),
      ...(input.mode === 'delete'
        ? {
            p_fingerprint: input.fingerprint,
            p_phrase: input.confirmation,
            ...(expanded
              ? { p_dependents: input.dependentsConfirmed === true }
              : {}),
          }
        : {}),
    });
    if (error) throw deletionFailure(error);
    if (input.mode === 'preview' && !result)
      throw new DeletionBlocked(
        'La vérification n’a pas pu être confirmée. Actualisez puis réessayez.',
        503,
      );
    if (input.entity === 'clients' && input.mode === 'delete') {
      if (
        result?.pending !== true ||
        result.deleted !== false ||
        result.id !== input.id ||
        typeof result.jobId !== 'string'
      )
        throw new DeletionBlocked(
          'La suppression des données du compte n’a pas été confirmée.',
        );
      const completion = await finishAccountDeletion(input.id, result.jobId);
      revalidatePath('/admin', 'layout');
      return ok(completion);
    }
    if (input.mode === 'delete') {
      if (!result?.deleted || result.id !== input.id)
        throw new DeletionBlocked('Suppression non confirmée.');
      for (const path of ['/admin', '/', '/services', '/offres'])
        revalidatePath(path, 'layout');
    }
    return ok(
      input.mode === 'preview'
        ? { ...result, deletionEnabled, expanded }
        : result,
    );
  } catch (error) {
    if (error instanceof DeletionBlocked)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return failure(error);
    // Never expose SQL, credentials, customer data or constraint internals.
    return NextResponse.json(
      {
        error:
          'Suppression non confirmée. La fiche peut avoir des dépendances ou être occupée. Actualisez pour vérifier son état avant de réessayer.',
      },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
