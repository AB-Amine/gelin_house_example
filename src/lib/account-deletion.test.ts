import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  remove: vi.fn(),
  complete: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('./supabase', () => ({
  privileged: () => ({
    auth: { admin: { getUserById: mocks.lookup, deleteUser: mocks.remove } },
    rpc: mocks.complete,
  }),
}));
import { finishAccountDeletion } from './account-deletion';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue({
    data: { user: { id: 'TEST' } },
    error: null,
  });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.complete.mockResolvedValue({
    data: { deleted: true, id: 'TEST' },
    error: null,
  });
});
it('finishes only after Auth deletion and SQL completion both succeed', async () => {
  expect((await finishAccountDeletion('TEST', 'JOB')).deleted).toBe(true);
  expect(mocks.remove).toHaveBeenCalledWith('TEST', false);
  expect(mocks.complete).toHaveBeenCalledWith(
    'gelin_complete_account_deletion',
    { p_job: 'JOB' },
  );
});
it('retains the durable pending operation after Auth failure without false success', async () => {
  mocks.remove.mockResolvedValue({ error: { message: 'SECRET' } });
  const result = await finishAccountDeletion('TEST', 'JOB');
  expect(result).toMatchObject({ deleted: false, pending: true, jobId: 'JOB' });
  expect(JSON.stringify(result)).not.toContain('SECRET');
  expect(mocks.complete).not.toHaveBeenCalled();
});
it('recovers when Auth was removed but the previous completion call failed', async () => {
  mocks.lookup.mockResolvedValue({
    data: { user: null },
    error: { status: 404 },
  });
  expect((await finishAccountDeletion('TEST', 'JOB')).deleted).toBe(true);
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('never claims success when final SQL verification fails', async () => {
  mocks.complete.mockResolvedValue({
    data: null,
    error: { message: 'GH_AUTH_DELETION_PENDING' },
  });
  expect((await finishAccountDeletion('TEST', 'JOB')).deleted).toBe(false);
});
