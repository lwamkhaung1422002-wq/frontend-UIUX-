import { defineConfig, devices } from '@playwright/test'

const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT || 4173)
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT || 43108)
const webBaseUrl = `http://127.0.0.1:${webPort}`
const apiBaseUrl = `http://127.0.0.1:${apiPort}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  // Full owner/template journeys share one isolated API database. A single
  // worker keeps bcrypt registration and Prisma transactions deterministic;
  // explicitly opt into more workers only on a provisioned CI database pool.
  workers: Number(process.env.PLAYWRIGHT_WORKERS || 1),
  reporter: 'list',
  use: {
    baseURL: webBaseUrl,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix ../Api run build && npm --prefix ../Api start',
      url: `${apiBaseUrl}/health/ready`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: String(apiPort),
        NODE_ENV: 'test',
        ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
      },
    },
    {
      command: `npm run build && node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, VITE_API_BASE_URL: apiBaseUrl },
    },
  ],
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
})
