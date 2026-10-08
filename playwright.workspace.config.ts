import { defineConfig, devices } from "@playwright/test"
import "dotenv/config"

export default defineConfig({
  testDir: "./app-tests/e2e",
  testMatch: "workspace.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm exec vite dev --port 3001 --strictPort",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
  },
})
