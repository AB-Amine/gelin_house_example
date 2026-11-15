import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/offer-cleanup-connection.mjs', () => ({
  cleanupConnection: mocks.connect,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
import { POST } from '@/app/api/internal/expired-offer-cleanup/route';
const secret = 'x'.repeat(40);
const request = (token = secret) =>
  new NextRequest('http://localhost/api/internal/expired-offer-cleanup', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('OFFER_CLEANUP_ENABLED', 'true');
  vi.stubEnv('OFFER_CLEANUP_SECRET', secret);
  mocks.connect.mockResolvedValue({ query: mocks.query, end: mocks.end });
  mocks.query.mockResolvedValue({
    rows: [{ result: { removed: 1, retained: 2, errors: 0 } }],
  });
});
afterEach(() => vi.unstubAllEnvs());
it('is disabled without database access', async () => {
  vi.stubEnv('OFFER_CLEANUP_ENABLED', 'false');
  expect((await POST(request())).status).toBe(503);
  expect(mocks.connect).not.toHaveBeenCalled();
});
it('rejects weak secret configuration', async () => {
  vi.stubEnv('OFFER_CLEANUP_SECRET', 'short');
  expect((await POST(request())).status).toBe(503);
  expect(mocks.connect).not.toHaveBeenCalled();
});
it('rejects forged token', async () => {
  expect((await POST(request('bad'))).status).toBe(403);
  expect(mocks.connect).not.toHaveBeenCalled();
});
it('executes only the parameterless cleanup function and returns verified counts', async () => {
  const response = await POST(request());
  expect(await response.json()).toEqual({ removed: 1, retained: 2, errors: 0 });
  expect(mocks.query).toHaveBeenCalledWith(
    'SELECT public.gelin_cleanup_expired_offers() AS result',
  );
  expect(mocks.end).toHaveBeenCalled();
});
it('handles failure without leaking SQL or refreshing', async () => {
  mocks.query.mockRejectedValue(Error('secret SQL'));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret SQL');
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.end).toHaveBeenCalled();
});
it('reports rolled-back/partial batch errors for monitoring', async () => {
  mocks.query.mockResolvedValue({
    rows: [{ result: { removed: 0, retained: 1, errors: 1 } }],
  });
  expect((await POST(request())).status).toBe(503);
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it('rejects malformed result without claiming success', async () => {
  mocks.query.mockResolvedValue({ rows: [] });
  expect((await POST(request())).status).toBe(503);
  expect(mocks.refresh).not.toHaveBeenCalled();
});
