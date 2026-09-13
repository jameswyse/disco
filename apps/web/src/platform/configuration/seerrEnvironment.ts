import { Config, ConfigProvider, Effect } from "effect";

import type { ConfigError, Either, Redacted } from "effect";

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export type SeerrEnvironment = Readonly<{
  apiKey: Redacted.Redacted;
  origin: URL;
}>;

const seerrEnvironmentConfig = Config.all({
  apiKey: Config.redacted("SEERR_API_KEY"),
  origin: Config.url("SEERR_URL"),
});

/** Parse the Seerr connection settings once at the process boundary. */
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
