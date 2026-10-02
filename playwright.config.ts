import { defineConfig, devices } from "@playwright/test";

// SMOKE_BASE_URL points the same checks at a deployed site; otherwise the built `dist` is previewed locally.
const external = process.env.SMOKE_BASE_URL;
const base = process.env.JOBSEARCH_BASE || "/JobSearch/";
const port = Number(process.env.SMOKE_PORT || 4173);
const local = `http://127.0.0.1:${port}${base}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: external || local, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run preview -- --port ${port} --strictPort`,
        url: local,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
