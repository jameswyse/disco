import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
      testIgnore: ["fixtures/**", "**/settings.spec.ts"],
      use: devices["Desktop Chrome"],
    },
    {
      // Preferences are instance-wide, so their mutations must follow every other browser test.
      name: "settings",
      dependencies: ["chromium"],
      testMatch: "**/settings.spec.ts",
      use: devices["Desktop Chrome"],
    },
  ],
  quiet: !process.env.DEBUG && process.env.DISCO_HUMAN_OUTPUT !== "1",
  reporter: testReporters(),
  retries: 0,
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
      command: "node tests/browser/fixtures/seerrServer.ts",
      reuseExistingServer: false,
      timeout: 30_000,
      // Seerr exposes status without authentication.
      url: `${seerrFixtureOrigin}/api/v1/status`,
      ignoreHTTPSErrors: false,
    },
    {
      command: `pnpm start --hostname 127.0.0.1 --port ${browserTestPort}`,
      env: {
        ...browserTestEnvironment,
        DISCO_DATA_DIR: mkdtempSync(join(tmpdir(), "disco-browser-")),
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${browserTestPort}/api/health`,
    },
  ],
});
