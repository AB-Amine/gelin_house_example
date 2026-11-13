import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './tests/preview',
  timeout: 120000,
  workers: 2,
  expect: { timeout: 15000 },
  outputDir: 'test-results/admin-preview',
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: {
    command: `"${process.execPath}" node_modules/next/dist/bin/next dev --hostname 127.0.0.1`,
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 180000,
    env: {
      APP_URL: 'http://127.0.0.1:3000',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      SUPABASE_SECRET_KEY: '',
    },
  },
});
