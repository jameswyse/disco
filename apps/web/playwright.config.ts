import { defineConfig, devices } from "@playwright/test";

import type { ReporterDescription } from "@playwright/test";

const browserTestPort = 3100;

function testReporters(): ReporterDescription[] {
  if (process.env.DISCO_HUMAN_OUTPUT === "1") {
    return [["list"]];
  }

  if (process.env.CI) {
    return [["github"], ["html", { open: "never", outputFolder: "tests/results/report" }]];
  }

  return [["dot"]];
}

export default defineConfig({
  forbidOnly: true,
  fullyParallel: true,
  outputDir: "tests/results/browser",
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
  quiet: !process.env.DEBUG && process.env.DISCO_HUMAN_OUTPUT !== "1",
  reporter: testReporters(),
  retries: process.env.CI ? 1 : 0,
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  testDir: "./tests/browser",
  timeout: 30_000,
  workers: process.env.CI ? 1 : "25%",
  use: {
    baseURL: `http://127.0.0.1:${browserTestPort}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    command: `pnpm start --hostname 127.0.0.1 --port ${browserTestPort}`,
    env: {
      SEERR_API_KEY: "browser-fixture-not-a-real-key",
      SEERR_URL: `http://127.0.0.1:${browserTestPort}/seerr-fixture`,
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${browserTestPort}/api/health`,
  },
});
