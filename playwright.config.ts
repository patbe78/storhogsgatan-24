import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      VITE_VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY ?? 'AQAB',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://playwright.invalid',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'playwright-anon-key'
    }
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /.*mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'android-chromium',
      testMatch: /.*mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'] }
    },
    {
      name: 'iphone-chromium',
      testMatch: /.*mobile\.spec\.ts/,
      use: { ...devices['iPhone 13'], browserName: 'chromium' }
    },
    {
      name: 'iphone-webkit',
      testMatch: /.*mobile\.spec\.ts/,
      use: { ...devices['iPhone 13'] }
    }
  ]
})
