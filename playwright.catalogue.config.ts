import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/catalogue',
  workers: 2,
  timeout: 60000,
  outputDir: 'test-results/catalogue',
  use: { baseURL: 'http://127.0.0.1:3130', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 812 },
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: [
    {
      command: `"${process.execPath}" scripts/catalogue-browser-fixture.mjs`,
      url: 'http://127.0.0.1:55445/health',
      reuseExistingServer: false,
    },
    {
      command: `"${process.execPath}" scripts/catalogue-test-server.mjs`,
      url: 'http://127.0.0.1:3130/services',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        APP_URL: 'http://127.0.0.1:3130',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55445',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-catalogue-key-not-a-secret',
        SUPABASE_SECRET_KEY: 'test-catalogue-secret-not-real',
      },
    },
  ],
});
