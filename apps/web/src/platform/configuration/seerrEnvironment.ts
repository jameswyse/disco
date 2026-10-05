import { Config, ConfigProvider, Effect } from "effect";

import type { Result, Redacted } from "effect";

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export type SeerrEnvironment = Readonly<{
  apiKey: Redacted.Redacted;
  origin: URL;
}>;

/** Seerr connection settings, read from `SEERR_URL` and `SEERR_API_KEY`. */
export const seerrEnvironmentConfig: Config.Config<SeerrEnvironment> = Config.all({
  apiKey: Config.Redacted("SEERR_API_KEY"),
  origin: Config.URL("SEERR_URL"),
});

/** Parse the Seerr connection settings once from a plain environment map. */
export function readSeerrEnvironment(
  environment: EnvironmentVariables,
): Result.Result<SeerrEnvironment, Config.ConfigError> {
  return Effect.runSync(
    Effect.result(
      seerrEnvironmentConfig.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown(environment),
        ),
      ),
    ),
  );
}
