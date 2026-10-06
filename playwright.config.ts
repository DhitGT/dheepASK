import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: '*.spec.ts', use: { baseURL: 'http://127.0.0.1:3107', browserName: 'chromium' },
  webServer: { command: 'npm run dev -- --dotenv tests/demo.env --host 127.0.0.1 --port 3107', url: 'http://127.0.0.1:3107', reuseExistingServer: false, timeout: 120000, env: { ASK_TEST_BUILD_DIR: '.nuxt-test', NUXT_PUBLIC_SUPABASE_URL: '', NUXT_PUBLIC_SUPABASE_ANON_KEY: '' } },
})
