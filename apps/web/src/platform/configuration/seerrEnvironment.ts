import { Config, ConfigProvider, Effect } from "effect";

import type { Result, Redacted } from "effect";

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export type SeerrEnvironment = Readonly<{
  apiKey: Redacted.Redacted;
  origin: URL;
}>;

export const seerrEnvironmentConfig: Config.Config<SeerrEnvironment> = Config.all({
  apiKey: Config.Redacted("SEERR_API_KEY"),
  origin: Config.URL("SEERR_URL"),
});

export function readSeerrEnvironment(
  environment: EnvironmentVariables = process.env,
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
