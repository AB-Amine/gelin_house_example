import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  return {
    staff: vi.fn(),
    rpc,
    db: { rpc },
    refresh: vi.fn(),
    finish: vi.fn(),
  };
});
vi.mock('@/lib/account-deletion', () => ({
  finishAccountDeletion: mocks.finish,
}));
vi.mock('@/lib/auth', () => ({ requireStaff: mocks.staff }));
vi.mock('@/lib/supabase', () => ({
  sessionDb: async () => mocks.db,
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
  vi.stubEnv('EXPANDED_DELETION_ENABLED', 'false');
  mocks.staff.mockResolvedValue({ id });
  mocks.rpc.mockResolvedValue({ data: { deleted: true, id }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe('session-authorized deletion RPC boundary', () => {
  it('keeps destructive execution inactive without invoking database functions', async () => {
    vi.stubEnv('PERMANENT_DELETION_ENABLED', 'false');
    expect(
      (
        await POST(
          request({
            entity: 'appointments',
            id,
            mode: 'delete',
            fingerprint,
            confirmation: 'SUPPRIMER',
          }),
        )
      ).status,
    ).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    'allows a read-only preview while disabled and preserves eligibility=%s',
    async (eligible) => {
      vi.stubEnv('PERMANENT_DELETION_ENABLED', 'false');
      const info = {
        id,
        eligible,
        reasons: eligible ? [] : ['Écritures financières protégées.'],
        fingerprint,
      };
      mocks.rpc.mockResolvedValue({ data: info, error: null });
      const response = await POST(
        request({ entity: 'appointments', id, mode: 'preview' }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ...info,
        deletionEnabled: false,
        expanded: false,
      });
      expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
        'gelin_preview_appointment',
        { p_id: id },
      );
      expect(mocks.refresh).not.toHaveBeenCalled();
    },
  );
  it('distinguishes missing database permission from the application flag', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'internal function details' },
    });
    const response = await POST(
      request({ entity: 'appointments', id, mode: 'preview' }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain('autorisations');
    expect(log).toHaveBeenCalledWith('[admin/permanent-deletion] rpc-failed', {
      rpc: 'gelin_preview_appointment',
      entity: 'appointments',
      mode: 'preview',
      code: '42501',
    });
    log.mockRestore();
  });
  it('uses the admin-verified session client for the expanded service preview', async () => {
    vi.stubEnv('EXPANDED_DELETION_ENABLED', 'true');
    mocks.rpc.mockResolvedValue({
      data: {
        id,
        entity: 'services',
        eligible: true,
        fingerprint,
        reasons: [],
        owned: [],
        details: {},
      },
      error: null,
    });
    const response = await POST(
      request({ entity: 'services', id, mode: 'preview' }),
    );
    expect(response.status).toBe(200);
    expect(mocks.staff).toHaveBeenCalledWith(mocks.db);
    expect(mocks.rpc).toHaveBeenCalledWith('gelin_crud_preview', {
      p_kind: 'services',
      p_id: id,
    });
  });
  it('reports unavailable preview functions without an installation claim', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'internal schema details' },
    });
    const response = await POST(
      request({ entity: 'appointments', id, mode: 'preview' }),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain(
      'vérification de suppression n’est pas disponible',
    );
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
    'keeps %s protected on a legacy deployment without expanded CRUD',
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
  it.each(['services', 'categories', 'promotions', 'appointments'])(
    'uses the expanded plan for %s with explicit dependent confirmation',
    async (entity) => {
      vi.stubEnv('EXPANDED_DELETION_ENABLED', 'true');
      const response = await POST(
        request({
          entity,
          id,
          mode: 'delete',
          fingerprint,
          confirmation: 'SUPPRIMER',
          dependentsConfirmed: true,
        }),
      );
      expect(response.status).toBe(200);
      expect(mocks.rpc).toHaveBeenCalledWith('gelin_crud_delete', {
        p_kind: entity,
        p_id: id,
        p_fingerprint: fingerprint,
        p_phrase: 'SUPPRIMER',
        p_dependents: true,
      });
      expect(mocks.refresh).toHaveBeenCalled();
    },
  );
  it('never reports account completion while Auth removal is pending', async () => {
    vi.stubEnv('EXPANDED_DELETION_ENABLED', 'true');
    const target = '00000000-0000-4000-8000-000000000002',
      job = '00000000-0000-4000-8000-000000000003';
    mocks.rpc.mockResolvedValue({
      data: { pending: true, deleted: false, id: target, jobId: job },
      error: null,
    });
    mocks.finish.mockResolvedValue({
      pending: true,
      deleted: false,
      id: target,
      jobId: job,
      message: 'En attente.',
    });
    const response = await POST(
      request({
        entity: 'clients',
        id: target,
        mode: 'delete',
        fingerprint,
        confirmation: 'SUPPRIMER',
        dependentsConfirmed: true,
      }),
    );
    expect((await response.json()).deleted).toBe(false);
    expect(mocks.finish).toHaveBeenCalledWith(target, job);
  });
  it('will not retry an unverified or substituted account job', async () => {
    vi.stubEnv('EXPANDED_DELETION_ENABLED', 'true');
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const response = await POST(
      request({
        entity: 'clients',
        id: '00000000-0000-4000-8000-000000000002',
        mode: 'retry',
        jobId: '00000000-0000-4000-8000-000000000003',
      }),
    );
    expect(response.status).toBe(404);
    expect(mocks.finish).not.toHaveBeenCalled();
  });
  it('does not accept database-only success as proof that an Auth account was removed', async () => {
    vi.stubEnv('EXPANDED_DELETION_ENABLED', 'true');
    const target = '00000000-0000-4000-8000-000000000002';
    mocks.rpc.mockResolvedValue({
      data: { deleted: true, id: target },
      error: null,
    });
    const response = await POST(
      request({
        entity: 'clients',
        id: target,
        mode: 'delete',
        fingerprint,
        confirmation: 'SUPPRIMER',
        dependentsConfirmed: true,
      }),
    );
    expect(response.status).toBe(409);
    expect(mocks.finish).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
