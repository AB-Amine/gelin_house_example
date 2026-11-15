import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ insert: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  privileged: () => ({
    from: (table: string) =>
      table === 'salon_settings'
        ? { select: () => ({ single: m.single }) }
        : table === 'services'
          ? { select: () => ({ in: () => ({ eq: m.eq }) }) }
          : { insert: m.insert },
  }),
}));
vi.mock('@/lib/client-auth', () => ({ clientSession: async () => null }));
vi.mock('@/lib/dates', () => ({ businessToday: () => '2026-01-01' }));
vi.mock('@/lib/http', () => ({
  sameOrigin: () => {},
  rateLimit: async () => {},
  body: (r: NextRequest) => r.json(),
  ok: (v: unknown) => Response.json(v),
  failure: (e: Error) => Response.json({ error: e.message }, { status: 409 }),
}));
import { POST } from '@/app/api/appointment-requests/route';
const id = '00000000-0000-4000-8000-000000000001';
const request = () =>
  new NextRequest('http://localhost/api/appointment-requests', {
    method: 'POST',
    body: JSON.stringify({
      services: [id],
      date: '2026-12-01',
      time: '12:00',
      name: 'Cliente locale',
      phone: '+212612345678',
      email: '',
      consent: true,
    }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.single.mockResolvedValue({
    data: { timezone: 'Africa/Casablanca' },
    error: null,
  });
  m.insert.mockResolvedValue({ error: null });
});
it('direct request API filters publication and refuses deactivated service without saving', async () => {
  let filters = 0;
  m.eq.mockImplementation((key: string, value: unknown) => {
    filters++;
    if (filters < 3) return { eq: m.eq };
    expect(key).toBe('service_type');
    expect(value).toBe('appointment');
    return Promise.resolve({ data: [], error: null });
  });
  const response = await POST(request());
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: 'INVALID_SERVICES' });
  expect(m.eq).toHaveBeenCalledWith('published', true);
  expect(m.eq).toHaveBeenCalledWith('archived', false);
  expect(m.insert).not.toHaveBeenCalled();
});
it('reactivated eligible service can create a request through unchanged flow', async () => {
  let filters = 0;
  m.eq.mockImplementation(() => {
    filters++;
    return filters < 3
      ? { eq: m.eq }
      : Promise.resolve({ data: [{ id, name: 'Manucure' }], error: null });
  });
  expect((await POST(request())).status).toBe(200);
  expect(m.insert).toHaveBeenCalledWith(
    expect.objectContaining({ service_ids: [id] }),
  );
});
