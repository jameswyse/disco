import { HttpClient, HttpClientResponse } from "@effect/platform";
import { ConfigProvider, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { SeerrClient } from "./client";

type StubResponse = Readonly<{ status: number; body: unknown }>;

function testClient(respond: (url: URL, headers: Headers) => StubResponse) {
  const requests: URL[] = [];
  const httpClient = HttpClient.make((request, url) =>
    Effect.sync(() => {
      requests.push(url);
      const stub = respond(url, new Headers(request.headers));

      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(stub.body), {
          headers: { "content-type": "application/json" },
          status: stub.status,
        }),
      );
    }),
  );
  const layer = SeerrClient.DefaultWithoutDependencies.pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient)),
    Layer.provide(
      Layer.setConfigProvider(
        ConfigProvider.fromMap(
          new Map([
            ["SEERR_URL", "https://seerr.example.test"],
            ["SEERR_API_KEY", "test-key"],
          ]),
        ),
      ),
    ),
  );
  const run = <A, E>(program: (client: SeerrClient) => Effect.Effect<A, E>) =>
    Effect.runPromise(Effect.flatMap(SeerrClient, program).pipe(Effect.provide(layer)));

  return { requests, run };
}

describe("SeerrClient", () => {
  it("sends the API key and builds discover queries against /api/v1", async () => {
    let receivedKey: string | null = null;
    const { requests, run } = testClient((_url, headers) => {
      receivedKey = headers.get("x-api-key");

      return { status: 200, body: { page: 1, totalPages: 1, totalResults: 0, results: [] } };
    });

    const page = await run((client) =>
      client.discoverTv({
        page: 2,
        sortBy: "first_air_date.desc",
        releasedAfter: "2026-06-15",
        watchRegion: "AU",
        watchProviders: [8, 337],
      }),
    );

    expect(page.totalResults).toBe(0);
    expect(receivedKey).toBe("test-key");
    expect(requests[0]?.origin).toBe("https://seerr.example.test");
    expect(requests[0]?.pathname).toBe("/api/v1/discover/tv");
    expect(Object.fromEntries(requests[0]?.searchParams ?? [])).toEqual({
      page: "2",
      sortBy: "first_air_date.desc",
      firstAirDateGte: "2026-06-15",
      watchRegion: "AU",
      watchProviders: "8|337",
    });
  });

  it("reports non-2xx statuses as SeerrRejected", async () => {
    const { run } = testClient(() => ({ status: 401, body: { message: "Unauthorized" } }));

    const outcome = await run((client) => Effect.flip(client.requestCount()));

    expect(outcome._tag).toBe("SeerrRejected");
    expect(outcome._tag === "SeerrRejected" && outcome.status).toBe(401);
  });

  it("reports bodies that fail schema validation as SeerrMalformed", async () => {
    const { run } = testClient(() => ({ status: 200, body: { version: 3 } }));

    const outcome = await run((client) => Effect.flip(client.status()));

    expect(outcome._tag).toBe("SeerrMalformed");
  });

  it("decodes trending pages that mix movies, series and people", async () => {
    const { run } = testClient(() => ({
      status: 200,
      body: {
        page: 1,
        totalPages: 1,
        totalResults: 3,
        results: [
          { id: 1, mediaType: "movie", title: "Film", mediaInfo: { tmdbId: 1, status: 5 } },
          { id: 2, mediaType: "tv", name: "Series", firstAirDate: "2025-01-01" },
          { id: 3, mediaType: "person", name: "Someone" },
        ],
      },
    }));

    const page = await run((client) => client.trending({ page: 1, mediaType: "all" }));

    expect(page.results.map((result) => result.mediaType)).toEqual(["movie", "tv", "person"]);
  });
});
