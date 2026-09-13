import { Config, ConfigProvider, Effect } from "effect";

import type { ConfigError, Either, Redacted } from "effect";

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export type SeerrEnvironment = Readonly<{
  apiKey: Redacted.Redacted;
  origin: URL;
}>;

/** Seerr connection settings, read from `SEERR_URL` and `SEERR_API_KEY`. */
export const seerrEnvironmentConfig: Config.Config<SeerrEnvironment> = Config.all({
  apiKey: Config.redacted("SEERR_API_KEY"),
  origin: Config.url("SEERR_URL"),
});

/** Parse the Seerr connection settings once from a plain environment map. */
export function readSeerrEnvironment(
  environment: EnvironmentVariables,
): Either.Either<SeerrEnvironment, ConfigError.ConfigError> {
  const definedEntries = Object.entries(environment).flatMap(
    ([name, value]): readonly [string, string][] => (value === undefined ? [] : [[name, value]]),
  );

  return Effect.runSync(
    Effect.either(
      seerrEnvironmentConfig.pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map(definedEntries))),
      ),
    ),
  );
}
