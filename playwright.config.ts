import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev',
    port: 4000,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ]
});