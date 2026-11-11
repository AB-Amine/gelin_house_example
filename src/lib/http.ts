import 'server-only';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { privileged } from './supabase';
export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export async function limitedBody(req: NextRequest, limit: number) {
  if (Number(req.headers.get('content-length')) > limit)
    throw Error('TOO_LARGE');
  const reader = req.body?.getReader();
  if (!reader) throw Error('INVALID_INPUT');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw Error('TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function body(req: NextRequest, limit = 16000) {
  return JSON.parse(
    (await limitedBody(req, limit)).toString('utf8'),
  ) as unknown;
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const expected = process.env.APP_URL ?? 'http://127.0.0.1:3000';
  if (!origin || origin !== new URL(expected).origin) throw Error('FORBIDDEN');
}
export async function rateLimit(req: NextRequest, scope: string, limit = 30) {
  // Enable a provider header only when that provider is the trusted ingress.
  const ip =
    process.env.TRUST_PROXY === 'netlify'
      ? req.headers.get('x-nf-client-connection-ip')?.trim() || 'unknown'
      : process.env.TRUST_PROXY === '1'
        ? (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          'unknown')
        : 'shared';
  const db = privileged();
  const { data, error } = await db.rpc('take_rate_limit', {
    p_key: tokenHash(`${scope}:${ip}`),
    p_limit: limit,
    p_seconds: 60,
  });
  if (error) throw Error('UNAVAILABLE');
  if (!data) throw Error('RATE_LIMIT');
}
const messages: Record<string, string> = {
  AUTH_FAILED: 'auth.invalid',
  CITY_UNAVAILABLE: 'error.CITY_UNAVAILABLE',
  CITY_SERVICE_UNAVAILABLE: 'error.CITY_SERVICE_UNAVAILABLE',
  PROMOTION_UNAVAILABLE: 'error.PROMOTION_UNAVAILABLE',
  LAST_OWNER: 'Le dernier compte administrateur actif doit être conservé.',
  INVITE_FAILED:
    'L’invitation a échoué. Vérifiez la configuration e-mail Supabase et l’adresse du compte.',
  NOT_CONFIGURED:
    'La réservation en ligne sera disponible après validation de la configuration du salon.',
  FORBIDDEN: 'Accès non autorisé ou session expirée.',
  NOT_FOUND: 'Ce rendez-vous est introuvable.',
  SLOT_UNAVAILABLE:
    'Ce créneau vient d’être réservé. Choisissez un autre horaire.',
  QUOTE_CHANGED:
    'Le tarif ou la disponibilité a changé. Vérifiez votre sélection.',
  OUTSIDE_WINDOW: 'Cette date ne respecte pas le délai de réservation.',
  INVALID_SLOT: 'Choisissez un créneau proposé par le salon.',
  SERVICE_UNAVAILABLE:
    'Une prestation n’est plus disponible. Modifiez votre sélection.',
  INVALID_SERVICES: 'Vérifiez les prestations sélectionnées.',
  IDEMPOTENCY_MISMATCH:
    'Cette demande a déjà été utilisée avec des informations différentes.',
  POLICY_BLOCKED:
    'Cette modification n’est pas autorisée par la politique du salon. Contactez le salon.',
  INVALID_TRANSITION: 'Ce changement de statut n’est pas autorisé.',
  REASON_REQUIRED: 'Indiquez le motif de l’annulation.',
  EXISTING_APPOINTMENTS:
    'Des rendez-vous existants sont concernés. Résolvez-les avant de modifier cette disponibilité.',
  ARCHIVE_INSTEAD: 'Archivez cet élément pour préserver l’historique.',
  RATE_LIMIT: 'Trop de tentatives. Patientez une minute.',
  TOO_LARGE: 'Le contenu envoyé est trop volumineux.',
};
export function failure(error: unknown) {
  let affected: { reference: string }[] = [];
  if (
    typeof error === 'object' &&
    error &&
    'message' in error &&
    String(error.message).includes('EXISTING_APPOINTMENTS') &&
    'details' in error
  ) {
    try {
      const value = JSON.parse(String(error.details));
      if (Array.isArray(value))
        affected = value
          .filter(
            (x) =>
              typeof x?.reference === 'string' &&
              /^GH-[A-F0-9]+$/.test(x.reference),
          )
          .slice(0, 50)
          .map((x) => ({ reference: x.reference }));
    } catch {}
  }
  const code =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : '';
  const known = Object.keys(messages).find((k) => code.includes(k));
  const status =
    known === 'FORBIDDEN'
      ? 403
      : known === 'RATE_LIMIT'
        ? 429
        : known === 'NOT_CONFIGURED'
          ? 503
          : known
            ? 409
            : 400;
  return NextResponse.json(
    {
      error: known
        ? messages[known]
        : 'Impossible de traiter la demande. Vérifiez les champs ou réessayez.',
      code: known ?? 'INVALID_REQUEST',
      ...(affected.length ? { affected } : {}),
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function ok(data: unknown) {
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
