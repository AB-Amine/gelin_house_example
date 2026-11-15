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
    mode: z.enum(['preview', 'delete']),
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
    // Account deletion remains blocked even when no SQL connection is enabled.
    if (input.entity === 'clients')
      throw new DeletionBlocked(
        input.id === staff.id
          ? 'Votre compte administrateur est protégé.'
          : 'Suppression de compte bloquée : Auth et les liens de réservation ne peuvent pas être supprimés de façon atomique avec le schéma actuel. Aucun compte ni profil ne sera supprimé.',
      );
    if (input.entity === 'services' && input.mode === 'delete')
      throw new DeletionBlocked(
        'Suppression de prestation bloquée : une demande concurrente peut encore enregistrer ses identifiants sans clé étrangère. La coordination du flux de demandes doit être approuvée avant activation.',
      );
    if (process.env.PERMANENT_DELETION_ENABLED !== 'true')
      throw new DeletionBlocked(
        'Suppression non activée. Les fonctions sécurisées doivent être installées après approbation.',
        503,
      );
    const functions = deletionFunctions[input.entity];
    const fn = functions[input.mode];
    if (!fn) throw new DeletionBlocked('Cette suppression reste bloquée.');
    if (
      input.mode === 'delete' &&
      (!input.fingerprint || input.confirmation !== 'SUPPRIMER')
    )
      throw new DeletionBlocked('Confirmation requise.', 400);
    const db = await sessionDb();
    const { data: result, error } = await db.rpc(fn, {
      p_id: input.id,
      ...(input.mode === 'delete'
        ? { p_fingerprint: input.fingerprint, p_phrase: input.confirmation }
        : {}),
    });
    if (error) throw deletionFailure(error);
    if (input.mode === 'delete') {
      if (!result?.deleted || result.id !== input.id)
        throw new DeletionBlocked('Suppression non confirmée.');
      for (const path of ['/admin', '/', '/prestations', '/offres'])
        revalidatePath(path, 'layout');
    }
    return ok(result);
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
