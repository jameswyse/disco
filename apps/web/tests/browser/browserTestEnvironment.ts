export const browserTestPort = 3100;
export const seerrFixturePort = 3191;
export const seerrFixtureApiKey = "browser-fixture-not-a-real-key";
export const seerrFixtureOrigin = `http://127.0.0.1:${seerrFixturePort}`;

export const browserTestEnvironment = {
  SEERR_API_KEY: seerrFixtureApiKey,
  SEERR_URL: seerrFixtureOrigin,
} as const satisfies Readonly<Record<string, string>>;
