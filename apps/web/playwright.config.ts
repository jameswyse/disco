import { defineConfig, devices } from "@playwright/test";

import {
  browserTestEnvironment,
  browserTestPort,
  seerrFixtureOrigin,
} from "./tests/browser/browserTestEnvironment";

import type { ReporterDescription } from "@playwright/test";

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
  testIgnore: ["fixtures/**"],
  timeout: 30_000,
  workers: process.env.CI ? 1 : "25%",
  use: {
    baseURL: `http://127.0.0.1:${browserTestPort}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: [
    {
      // Saved views live in the data directory; clear it so every run starts from the defaults.
      command: "rm -rf tests/results/data && node tests/browser/fixtures/seerrServer.ts",
      reuseExistingServer: false,
      timeout: 30_000,
      // The fixture rejects unauthenticated requests, so a 401 also proves it is listening.
      url: `${seerrFixtureOrigin}/api/v1/status`,
      ignoreHTTPSErrors: false,
    },
    {
      command: `pnpm start --hostname 127.0.0.1 --port ${browserTestPort}`,
      env: browserTestEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${browserTestPort}/api/health`,
    },
  ],
});
