// A production-mode browser audit that cannot target the salon's Supabase project.
// NEXT_PUBLIC values must be isolated at BUILD time as well as at runtime.
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  E2E_DATABASE_ISOLATED: 'false',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:1',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'x', // Fails publicConfig's existing key validation.
  SUPABASE_SECRET_KEY: 'disabled-for-local-audit',
  PERMANENT_DELETION_ENABLED: 'false',
  OFFER_CLEANUP_ENABLED: 'false',
  OFFER_CLEANUP_DATABASE_URL: '',
  OFFER_CLEANUP_SECRET: '',
  APP_URL: 'http://127.0.0.1:3100',
};
for (const args of [
  ['node_modules/next/dist/bin/next', 'build'],
  [
    'node_modules/@playwright/test/cli.js',
    'test',
    '--config',
    'playwright.config.ts',
    ...process.argv.slice(2),
  ],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
