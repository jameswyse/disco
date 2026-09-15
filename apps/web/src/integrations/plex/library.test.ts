import { HttpClient, HttpClientResponse } from "@effect/platform";
import { ConfigProvider, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { PlexLibrary } from "./library";

function library(respond: (url: URL, headers: Headers) => { status: number; body: unknown }) {
  const http = HttpClient.make((request, url) =>
    Effect.sync(() => {
      const response = respond(url, new Headers(request.headers));

      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }),
  );

  return PlexLibrary.DefaultWithoutDependencies.pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
    Layer.provide(
      Layer.setConfigProvider(
        ConfigProvider.fromMap(
          new Map([
            ["SEERR_URL", "https://seerr.example.test"],
            ["SEERR_API_KEY", "fixture-seerr-key"],
          ]),
        ),
      ),
    ),
  );
}

describe("Plex library discovery", () => {
  it("uses an advertised HTTPS address when the configured private address is unreachable", async () => {
    const origins: string[] = [];
    const layer = library((url) => {
      origins.push(url.origin);

      if (url.pathname.endsWith("/servers")) {
        return {
          status: 200,
          body: [
            {
              clientIdentifier: "configured",
              accessToken: "fixture-token",
              connection: [{ uri: "https://public.plex.example.test:32400", local: false }],
            },
          ],
        };
      }

      if (url.pathname === "/api/v1/settings/plex") {
        return {
          status: 200,
          body: {
            machineId: "configured",
            ip: "private.plex.example.test",
            port: 32400,
            useSsl: false,
          },
        };
      }

      if (url.hostname === "private.plex.example.test") {
        return { status: 503, body: {} };
      }

      return {
        status: 200,
        body: {
          MediaContainer:
            url.pathname === "/" ? { machineIdentifier: "configured" } : { size: 0, totalSize: 0 },
        },
      };
    });
    const result = await Effect.runPromise(
      Effect.flatMap(PlexLibrary, (plex) => plex.episodes("123")).pipe(Effect.provide(layer)),
    );
    expect(result.size).toBe(0);
    expect(origins).toEqual([
      "https://seerr.example.test",
      "https://seerr.example.test",
      "http://private.plex.example.test:32400",
      "https://public.plex.example.test:32400",
      "https://public.plex.example.test:32400",
    ]);
  });

  it("uses the configured server, keeps each credential on its service, and reads every episode page", async () => {
    const seen: { url: URL; headers: Headers }[] = [];
    const layer = library((url, headers) => {
      seen.push({ url, headers });

      if (url.hostname === "seerr.example.test") {
        return {
          status: 200,
          body: url.pathname.endsWith("/servers")
            ? [
                { clientIdentifier: "other", accessToken: "other-token" },
                { clientIdentifier: "configured", accessToken: "fixture-plex-token" },
              ]
            : { machineId: "configured", ip: "plex.example.test", port: 32400, useSsl: true },
        };
      }

      if (url.pathname === "/") {
        return { status: 200, body: { MediaContainer: { machineIdentifier: "configured" } } };
      }

      const start = url.searchParams.get("X-Plex-Container-Start");

      return {
        status: 200,
        body: {
          MediaContainer: {
            size: 2,
            totalSize: 4,
            Metadata:
              start === "0"
                ? [
                    {
                      parentIndex: 1,
                      index: 1,
                      Media: [{ id: 1, Part: [{ file: "/tv/Example/Example.S01E01-1080p.mkv" }] }],
                    },
                    { parentIndex: 1, index: 1, Media: [{ id: 2 }] },
                  ]
                : [
                    {
                      parentIndex: 1,
                      index: 2,
                      Media: [{ id: 3, Part: [{ file: "/tv/Example/Example - S01E02-E04.mkv" }] }],
                    },
                    { parentIndex: 1, index: 5, Media: [] },
                  ],
          },
        },
      };
    });
    const episodes = await Effect.runPromise(
      Effect.flatMap(PlexLibrary, (plex) => plex.episodes("123")).pipe(Effect.provide(layer)),
    );
    expect([...episodes]).toEqual(["1:1", "1:2", "1:3", "1:4"]);
    const discovery = seen.filter(({ url }) => url.hostname === "seerr.example.test");
    const plexRequests = seen.filter(({ url }) => url.hostname === "plex.example.test");
    expect(discovery).toHaveLength(2);

    for (const { headers } of discovery) {
      expect(headers.get("x-api-key")).toBe("fixture-seerr-key");
      expect(headers.has("x-api-user")).toBe(false);
      expect(headers.has("x-plex-token")).toBe(false);
    }

    expect(plexRequests).toHaveLength(3);

    for (const { url, headers } of plexRequests) {
      expect(url.origin).toBe("https://plex.example.test:32400");

      expect(headers.get("x-plex-token")).toBe("fixture-plex-token");
      expect(headers.has("x-api-key")).toBe(false);
    }
  });

  it("reports unavailable discovery without including credentials or the upstream body", async () => {
    const layer = library(() => ({ status: 403, body: { token: "private-upstream-value" } }));
    const result = await Effect.runPromise(
      Effect.flatMap(PlexLibrary, (plex) => plex.episodes("123")).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );
    expect(result).toMatchObject({ _tag: "Left", left: { _tag: "PlexLibraryUnavailable" } });
    expect(JSON.stringify(result)).not.toMatch(/fixture-seerr-key|private-upstream-value/);
  });

  it("does not connect to a different server when Seerr's configured server is absent", async () => {
    const layer = library((url) => {
      expect(url.hostname).toBe("seerr.example.test");

      return {
        status: 200,
        body: url.pathname.endsWith("/servers")
          ? [{ clientIdentifier: "other", accessToken: "other-token" }]
          : { machineId: "configured", ip: "plex.example.test", port: 32400, useSsl: true },
      };
    });
    const result = await Effect.runPromise(
      Effect.flatMap(PlexLibrary, (plex) => plex.episodes("123")).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );
    expect(result).toMatchObject({ _tag: "Left" });
  });
});
