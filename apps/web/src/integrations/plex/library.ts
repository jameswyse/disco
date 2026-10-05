import { Context, Data, Effect, Layer, Redacted, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { seerrEnvironmentConfig } from "@/platform/configuration/seerrEnvironment";

const pathSeparator = /[\\/]/;
const episodeRange = /\bs(\d{1,4})e(\d{1,4})-e(\d{1,4})\b/i;

const PlexSettings = Schema.Struct({
  machineId: Schema.NonEmptyString,
  ip: Schema.NonEmptyString,
  port: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 1, maximum: 65535 })),
  ),
  useSsl: Schema.Boolean,
});

const PlexDevices = Schema.Array(
  Schema.Struct({
    clientIdentifier: Schema.String,
    accessToken: Schema.optional(Schema.RedactedFromValue(Schema.NonEmptyString)),
    connection: Schema.optional(
      Schema.Array(
        Schema.Struct({
          uri: Schema.URLFromString.pipe(
            Schema.check(
              Schema.makeFilter((url) => url.protocol === "https:" || url.protocol === "http:"),
            ),
          ),
          local: Schema.Boolean,
        }),
      ),
    ),
  }),
);

const PlexIdentity = Schema.Struct({
  MediaContainer: Schema.Struct({ machineIdentifier: Schema.String }),
});

const EpisodePage = Schema.Struct({
  MediaContainer: Schema.Struct({
    size: Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isGreaterThanOrEqualTo(0)),
    ),
    totalSize: Schema.optional(
      Schema.Number.pipe(
        Schema.check(Schema.isInt()),
        Schema.check(Schema.isGreaterThanOrEqualTo(0)),
      ),
    ),
    Metadata: Schema.optional(
      Schema.Array(
        Schema.Struct({
          parentIndex: Schema.Number.pipe(
            Schema.check(Schema.isInt()),
            Schema.check(Schema.isGreaterThanOrEqualTo(0)),
          ),
          index: Schema.Number.pipe(
            Schema.check(Schema.isInt()),
            Schema.check(Schema.isGreaterThanOrEqualTo(0)),
          ),
          Media: Schema.optional(
            Schema.Array(
              Schema.Struct({
                id: Schema.Number,
                Part: Schema.optional(
                  Schema.Array(Schema.Struct({ file: Schema.optional(Schema.String) })),
                ),
              }),
            ),
          ),
        }),
      ),
    ),
  }),
});

export class PlexLibraryUnavailable extends Data.TaggedError("PlexLibraryUnavailable")<{
  message: string;
}> {}

export class PlexLibrary extends Context.Service<PlexLibrary>()("PlexLibrary", {
  make: Effect.gen(function* () {
    const environment = yield* seerrEnvironmentConfig;
    const http = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);

    const seerr = http.pipe(
      HttpClient.mapRequest(
        HttpClientRequest.setHeader("X-Api-Key", Redacted.value(environment.apiKey)),
      ),
    );

    const discover = Effect.gen(function* () {
      const [settings, devices] = yield* Effect.all(
        [
          seerr
            .get(new URL("api/v1/settings/plex", environment.origin))
            .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(PlexSettings))),
          seerr
            .get(new URL("api/v1/settings/plex/devices/servers", environment.origin))
            .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(PlexDevices))),
        ],
        { concurrency: "unbounded" },
      );

      const device = devices.find((candidate) => candidate.clientIdentifier === settings.machineId);

      if (!device?.accessToken) {
        return yield* new PlexLibraryUnavailable({
          message: "Seerr did not provide access to its configured Plex server.",
        });
      }

      const hostname =
        settings.ip.includes(":") && !settings.ip.startsWith("[")
          ? `[${settings.ip}]`
          : settings.ip;

      const origin = yield* Effect.try(
        () => new URL(`${settings.useSsl ? "https" : "http"}://${hostname}:${settings.port}`),
      );

      const token = device.accessToken;

      const secureConnections = (device.connection ?? [])
        .filter((connection) => connection.uri.protocol === "https:")
        .toSorted((a, b) => Number(a.local) - Number(b.local));

      const candidates = [
        ...new Set([
          origin.origin,
          ...secureConnections.map((connection) => connection.uri.origin),
        ]),
      ];

      const reachable = yield* Effect.firstSuccessOf(
        candidates.map((candidate) =>
          http
            .get(candidate, {
              headers: { Accept: "application/json", "X-Plex-Token": Redacted.value(token) },
            })
            .pipe(
              Effect.flatMap(HttpClientResponse.schemaBodyJson(PlexIdentity)),
              Effect.filterOrFail(
                (identity) => identity.MediaContainer.machineIdentifier === settings.machineId,
                () =>
                  new PlexLibraryUnavailable({
                    message: "Plex server identity does not match Seerr.",
                  }),
              ),
              Effect.as(new URL(candidate)),
              Effect.timeoutOrElse({
                duration: "5 seconds",
                orElse: () =>
                  Effect.fail(
                    new PlexLibraryUnavailable({ message: "Plex connection timed out." }),
                  ),
              }),
            ),
        ),
      );

      return { origin: reachable, token };
    }).pipe(
      Effect.mapError((error) =>
        error._tag === "PlexLibraryUnavailable"
          ? error
          : new PlexLibraryUnavailable({
              message: `Plex connection could not be discovered through Seerr (${error._tag === "HttpClientError" ? error.reason._tag : error._tag}).`,
            }),
      ),
      Effect.provideService(FetchHttpClient.RequestInit, { redirect: "error" }),
    );

    const connection = yield* Effect.cachedWithTTL(discover, "5 minutes");

    return {
      episodes: (ratingKey: string) =>
        Effect.gen(function* () {
          const { origin, token } = yield* connection;
          const available = new Set<string>();
          let offset = 0;

          for (;;) {
            const url = new URL(
              `/library/metadata/${encodeURIComponent(ratingKey)}/allLeaves`,
              origin,
            );

            url.searchParams.set("X-Plex-Container-Start", String(offset));
            url.searchParams.set("X-Plex-Container-Size", "500");

            const response = yield* http
              .get(url, {
                headers: {
                  Accept: "application/json",
                  "X-Plex-Token": Redacted.value(token),
                  "X-Plex-Product": "Disco",
                  "X-Plex-Client-Identifier": "disco-availability",
                },
              })
              .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(EpisodePage)));

            const page = response.MediaContainer;

            for (const episode of page.Metadata ?? []) {
              if (episode.Media && episode.Media.length > 0) {
                available.add(`${episode.parentIndex}:${episode.index}`);

                for (const media of episode.Media) {
                  for (const part of media.Part ?? []) {
                    const filename = part.file?.split(pathSeparator).at(-1);
                    const range = filename?.match(episodeRange);

                    if (
                      range &&
                      Number(range[1]) === episode.parentIndex &&
                      Number(range[2]) === episode.index
                    ) {
                      for (
                        let number = episode.index + 1;
                        number <= Number(range[3]);
                        number += 1
                      ) {
                        available.add(`${episode.parentIndex}:${number}`);
                      }
                    }
                  }
                }
              }
            }

            offset += page.size;

            if (page.totalSize === undefined || offset >= page.totalSize) {
              return available;
            }

            if (page.size === 0) {
              return yield* new PlexLibraryUnavailable({
                message: "Plex returned an incomplete episode list.",
              });
            }
          }
        }).pipe(
          Effect.mapError((error) =>
            error._tag === "PlexLibraryUnavailable"
              ? error
              : new PlexLibraryUnavailable({
                  message: `Plex episode availability could not be loaded (${error._tag === "HttpClientError" ? error.reason._tag : error._tag}).`,
                }),
          ),
          Effect.provideService(FetchHttpClient.RequestInit, { redirect: "error" }),
        ),
    };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(Layer.provide(FetchHttpClient.layer));
}
