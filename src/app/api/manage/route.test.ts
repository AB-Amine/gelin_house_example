import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), cookieSet: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => ({ value: 'a'.repeat(64) }),
    set: mocks.cookieSet,
  }),
}));
vi.mock('@/lib/supabase', () => ({ privileged: () => ({ rpc: mocks.rpc }) }));
import { POST } from './route';

const visibleId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
function request(payload: unknown) {
  return new NextRequest('http://127.0.0.1:3000/api/manage', {
    method: 'POST',
    headers: {
      origin: 'http://127.0.0.1:3000',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
describe('guest booking identity across browser tabs', () => {
  beforeEach(() => {
    vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (name: string) => ({
      data:
        name === 'take_rate_limit'
          ? true
          : name === 'manage_booking'
            ? { id: otherId, items: [] }
            : { success: true },
      error: null,
    }));
  });
  it.each(['cancelled_by_customer', 'reschedule', 'slots'])(
    'rejects %s if a second tab replaced the cookie',
    async (action) => {
      const response = await POST(
        request({
          action,
          id: visibleId,
          start: '2026-12-01T10:00:00Z',
          date: '2026-12-01',
        }),
      );
      expect(response.status).toBe(403);
      expect(mocks.rpc.mock.calls.map(([name]) => name)).not.toContain(
        'change_booking',
      );
      expect(mocks.rpc.mock.calls.map(([name]) => name)).not.toContain(
        'available_slots',
      );
    },
  );
  it('allows cancellation when the displayed booking matches the cookie', async () => {
    expect(
      (await POST(request({ action: 'cancelled_by_customer', id: otherId })))
        .status,
    ).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'change_booking',
      expect.objectContaining({ p_id: otherId }),
    );
  });
  it('rejects a mutation that does not identify the reviewed booking', async () => {
    expect(
      (await POST(request({ action: 'cancelled_by_customer' }))).status,
    ).toBe(400);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).not.toContain(
      'change_booking',
    );
  });
});
