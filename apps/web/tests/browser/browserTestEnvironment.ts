export const browserTestPort = 3100;
export const seerrFixturePort = 3191;
export const seerrFixtureApiKey = "browser-fixture-not-a-real-key";
export const seerrFixtureOrigin = `http://127.0.0.1:${seerrFixturePort}`;

export const browserTestEnvironment = {
  /** Saved views are written here; each run starts from the defaults. */
  DISCO_DATA_DIR: "tests/results/data",
  SEERR_API_KEY: seerrFixtureApiKey,
  SEERR_URL: seerrFixtureOrigin,
} as const satisfies Readonly<Record<string, string>>;
