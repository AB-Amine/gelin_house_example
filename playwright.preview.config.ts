import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testDir: './tests/preview',
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    env: {
      APP_URL: 'http://127.0.0.1:3000',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      SUPABASE_SECRET_KEY: '',
    },
  },
});
