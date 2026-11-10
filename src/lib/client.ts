export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public affected: { reference: string }[] = [],
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  payload?: unknown,
  method = 'POST',
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error ?? 'La demande a échoué.',
      data.code ?? 'INVALID_REQUEST',
      data.affected ?? [],
    );
  return data as T;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'La connexion a été interrompue. Réessayez.';
}
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}
