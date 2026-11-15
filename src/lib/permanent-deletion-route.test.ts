import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  staff: vi.fn(),
  rpc: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ requireStaff: mocks.staff }));
vi.mock('@/lib/supabase', () => ({
  sessionDb: async () => ({ rpc: mocks.rpc }),
}));
vi.mock('@/lib/http', () => ({
  sameOrigin: (r: NextRequest) => {
    if (r.headers.get('origin') !== 'http://localhost')
      throw Error('FORBIDDEN');
  },
  body: (r: NextRequest) => r.json(),
  ok: (v: unknown) => Response.json(v),
  failure: () => Response.json({}, { status: 403 }),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
import { POST } from '@/app/api/admin/permanent-deletion/route';
const id = '00000000-0000-4000-8000-000000000001',
  fingerprint = 'a'.repeat(64);
function request(payload: object, origin = 'http://localhost') {
  return new NextRequest('http://localhost/api/admin/permanent-deletion', {
    method: 'POST',
    headers: { origin },
    body: JSON.stringify(payload),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('PERMANENT_DELETION_ENABLED', 'true');
  mocks.staff.mockResolvedValue({ id });
  mocks.rpc.mockResolvedValue({ data: { deleted: true, id }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe('session-authorized deletion RPC boundary', () => {
  it('defaults to inactive without invoking database functions', async () => {
    vi.stubEnv('PERMANENT_DELETION_ENABLED', 'false');
    expect(
      (await POST(request({ entity: 'categories', id, mode: 'preview' })))
        .status,
    ).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects cross-origin', async () => {
    expect(
      (
        await POST(
          request(
            { entity: 'categories', id, mode: 'preview' },
            'https://other.example',
          ),
        )
      ).status,
    ).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(['anonymous', 'customer'])(
    'rejects %s sessions before RPC',
    async () => {
      mocks.staff.mockRejectedValue(Error('FORBIDDEN'));
      expect(
        (await POST(request({ entity: 'categories', id, mode: 'preview' })))
          .status,
      ).toBe(403);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it.each([
    { entity: 'customers', id, mode: 'preview' },
    { entity: 'categories', id: 'bad', mode: 'delete' },
    { entity: 'categories', id, mode: 'delete', actor: id },
  ])('rejects malformed target or caller-supplied actor', async (payload) => {
    expect((await POST(request(payload))).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(['services', 'clients'])(
    'keeps %s deletion blocked regardless of flags',
    async (entity) => {
      expect(
        (
          await POST(
            request({
              entity,
              id,
              mode: 'delete',
              fingerprint,
              confirmation: 'SUPPRIMER',
            }),
          )
        ).status,
      ).toBe(409);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it('requires confirmation', async () => {
    expect(
      (await POST(request({ entity: 'categories', id, mode: 'delete' })))
        .status,
    ).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('uses a fixed preview function with no actor', async () => {
    await POST(request({ entity: 'categories', id, mode: 'preview' }));
    expect(mocks.rpc).toHaveBeenCalledWith('gelin_preview_category', {
      p_id: id,
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('uses a fixed delete function with explicit confirmation and verifies success', async () => {
    const response = await POST(
      request({
        entity: 'categories',
        id,
        mode: 'delete',
        fingerprint,
        confirmation: 'SUPPRIMER',
      }),
    );
    expect(await response.json()).toEqual({ deleted: true, id });
    expect(mocks.rpc).toHaveBeenCalledWith('gelin_delete_category', {
      p_id: id,
      p_fingerprint: fingerprint,
      p_phrase: 'SUPPRIMER',
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it('does not refresh on absent/unconfirmed response', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect(
      (
        await POST(
          request({
            entity: 'categories',
            id,
            mode: 'delete',
            fingerprint,
            confirmation: 'SUPPRIMER',
          }),
        )
      ).status,
    ).toBe(409);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('sanitizes unknown database errors', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'password=SECRET SQL' },
    });
    const response = await POST(
      request({
        entity: 'categories',
        id,
        mode: 'delete',
        fingerprint,
        confirmation: 'SUPPRIMER',
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain('SECRET');
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('returns safe database dependency messages', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'GH_DELETE_BLOCKED',
        details: JSON.stringify(['Historique protégé.']),
      },
    });
    const response = await POST(
      request({
        entity: 'categories',
        id,
        mode: 'delete',
        fingerprint,
        confirmation: 'SUPPRIMER',
      }),
    );
    expect(await response.json()).toEqual({ error: 'Historique protégé.' });
  });
});
