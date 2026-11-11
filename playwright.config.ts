import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const live = process.env.E2E_DATABASE_ISOLATED === 'true';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 2,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {name:'tablet',use:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}},
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: `"${process.execPath}" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100`,
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 180000,
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
