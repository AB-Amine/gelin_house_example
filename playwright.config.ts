import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const live = process.env.E2E_DATABASE_ISOLATED === 'true';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run start -- --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: {
      APP_URL: 'http://127.0.0.1:3100',
      ...(!live
        ? {
            NEXT_PUBLIC_SUPABASE_URL: '',
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
            SUPABASE_SECRET_KEY: '',
          }
        : {}),
    },
  },
});
