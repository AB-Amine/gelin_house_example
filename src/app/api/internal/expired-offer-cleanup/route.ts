import { timingSafeEqual, createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cleanupConnection } from '@/lib/offer-cleanup-connection.mjs';
import { revalidatePath } from 'next/cache';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const secret = process.env.OFFER_CLEANUP_SECRET;
  const hash = (s: string) => createHash('sha256').update(s).digest();
  const headers = { 'Cache-Control': 'no-store' };
  if (
    process.env.OFFER_CLEANUP_ENABLED !== 'true' ||
    !secret ||
    secret.length < 32
  )
    return NextResponse.json(
      { error: 'Nettoyage non activé.' },
      { status: 503, headers },
    );
  if (
    !timingSafeEqual(
      hash(req.headers.get('authorization') ?? ''),
      hash(`Bearer ${secret}`),
    )
  )
    return NextResponse.json(
      { error: 'Accès non autorisé.' },
      { status: 403, headers },
    );
  try {
    const db = await cleanupConnection();
    try {
      // The login can EXECUTE this function only; it has no table privileges.
      const { rows } = await db.query(
        'SELECT public.gelin_cleanup_expired_offers() AS result',
      );
      const result = rows[0]?.result;
      if (
        !result ||
        ![result.removed, result.retained, result.errors].every(
          (n) => Number.isSafeInteger(n) && n >= 0,
        )
      )
        throw Error('CLEANUP_UNCONFIRMED');
      if (result.removed)
        for (const path of ['/', '/offres', '/admin/promotions'])
          revalidatePath(path, 'layout');
      // No identities, credentials or historical payloads in scheduler logs.
      console.info('expired-offer-cleanup', result);
      return NextResponse.json(result, {
        status: result.errors ? 503 : 200,
        headers,
      });
    } finally {
      await db.end();
    }
  } catch {
    return NextResponse.json(
      {
        error:
          'Nettoyage indisponible ; vérifier la connexion dédiée et les permissions.',
      },
      { status: 503, headers },
    );
  }
}
