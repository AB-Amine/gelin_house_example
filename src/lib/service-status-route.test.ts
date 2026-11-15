import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  staff: vi.fn(),
  rpc: vi.fn(),
  read: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ requireStaff: m.staff }));
vi.mock('@/lib/supabase', () => ({
  sessionDb: async () => ({
    rpc: m.rpc,
    from: () => ({ select: () => ({ eq: () => ({ single: m.read }) }) }),
  }),
}));
vi.mock('@/lib/http', () => ({
  sameOrigin: (r: NextRequest) => {
    if (r.headers.get('origin') !== 'http://localhost')
      throw Error('FORBIDDEN');
  },
  body: (r: NextRequest) => r.json(),
  ok: (v: unknown) => Response.json(v),
  failure: () => Response.json({ error: 'refusé' }, { status: 409 }),
}));
vi.mock('next/cache', () => ({ revalidatePath: m.refresh }));
import { POST } from '@/app/api/admin/service-status/route';
const id = '00000000-0000-4000-8000-000000000001';
const request = (payload: object, origin = 'http://localhost') =>
  new NextRequest('http://localhost/api/admin/service-status', {
    method: 'POST',
    headers: { origin },
    body: JSON.stringify(payload),
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.staff.mockResolvedValue({ id });
  m.read.mockResolvedValue({ data: { id }, error: null });
  m.rpc.mockResolvedValue({
    data: { id, published: false, archived: false },
    error: null,
  });
});
it('deactivates only publication through existing authorized editor', async () => {
  expect(
    (await POST(request({ id, active: false, confirmation: 'CONFIRMER' })))
      .status,
  ).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith('admin_save', {
    p_table: 'services',
    p_data: { id, published: false },
  });
  expect(m.refresh).toHaveBeenCalled();
});
it('reactivates publication and removes archival without altering booking flags or prices', async () => {
  m.rpc.mockResolvedValue({
    data: { id, published: true, archived: false },
    error: null,
  });
  expect(
    (await POST(request({ id, active: true, confirmation: 'CONFIRMER' })))
      .status,
  ).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith('admin_save', {
    p_table: 'services',
    p_data: { id, published: true, archived: false },
  });
});
it.each([
  { id, active: false },
  { id: 'bad', active: false, confirmation: 'CONFIRMER' },
  { id, active: false, confirmation: 'CONFIRMER', price_minor: 0 },
])(
  'rejects missing confirmation, invalid id or unrelated fields',
  async (payload) => {
    expect((await POST(request(payload))).status).toBe(409);
    expect(m.rpc).not.toHaveBeenCalled();
  },
);
it('rejects unauthorized sessions and cross-origin before writes', async () => {
  await POST(
    request(
      { id, active: false, confirmation: 'CONFIRMER' },
      'https://other.example',
    ),
  );
  expect(m.rpc).not.toHaveBeenCalled();
  m.staff.mockRejectedValue(Error('FORBIDDEN'));
  await POST(request({ id, active: false, confirmation: 'CONFIRMER' }));
  expect(m.rpc).not.toHaveBeenCalled();
});
it('does not create a missing service or report unconfirmed success', async () => {
  m.read.mockResolvedValue({ data: null, error: { message: 'missing' } });
  await POST(request({ id, active: false, confirmation: 'CONFIRMER' }));
  expect(m.rpc).not.toHaveBeenCalled();
  expect(m.refresh).not.toHaveBeenCalled();
});
