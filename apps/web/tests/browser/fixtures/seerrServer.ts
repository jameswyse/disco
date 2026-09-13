/**
 * Minimal stand-in for the Seerr API used by browser tests. It serves deterministic fixtures for
 * the endpoints Disco reads and rejects requests without the fixture API key.
 */
import { createServer } from "node:http";

import { seerrFixtureApiKey, seerrFixturePort } from "../browserTestEnvironment.ts";

import type { IncomingMessage, ServerResponse } from "node:http";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const mediaInfo = (tmdbId: number, status: number) => ({ tmdbId, status, mediaUrl: null });

const upcomingMovie = {
  id: 102,
  mediaType: "movie",
  title: "Fixture Film Two",
  releaseDate: "2026-09-01",
  posterPath: null,
  overview: "A second film.",
  voteAverage: 6.5,
  voteCount: 3,
  popularity: 120,
  genreIds: [35],
} satisfies JsonValue;

const movies = [
  {
    id: 101,
    mediaType: "movie",
    title: "Fixture Film One",
    releaseDate: "2026-07-08",
    posterPath: "/fixture-film-one.jpg",
    overview: "A film from the fixture server.",
    voteAverage: 7.14,
    voteCount: 561,
    popularity: 326.2,
    genreIds: [28, 12],
    mediaInfo: mediaInfo(101, 5),
  },
  upcomingMovie,
] satisfies JsonValue[];

const series = [
  {
    id: 201,
    mediaType: "tv",
    name: "Fixture Series One",
    firstAirDate: "2025-03-13",
    posterPath: "/fixture-series-one.jpg",
    overview: "A series from the fixture server.",
    voteAverage: 8.2,
    voteCount: 2100,
    popularity: 900,
    genreIds: [18, 80],
    mediaInfo: mediaInfo(201, 3),
  },
] satisfies JsonValue[];

const person = { id: 301, mediaType: "person", name: "Fixture Person" } satisfies JsonValue;

function page(results: readonly JsonValue[]): JsonValue {
  return { page: 1, totalPages: 1, totalResults: results.length, results: [...results] };
}

const routes = {
  "/api/v1/status": { version: "3.4.1" },
  "/api/v1/settings/public": {
    applicationTitle: "Seerr",
    applicationUrl: `http://127.0.0.1:${seerrFixturePort}`,
    discoverRegion: "AU",
    streamingRegion: "AU",
    hideAvailable: true,
  },
  "/api/v1/auth/me": { id: 1, displayName: "Fixture User", avatar: null },
  "/api/v1/request/count": {
    total: 5,
    pending: 1,
    approved: 4,
    processing: 2,
    available: 2,
  },
  "/api/v1/genres/movie": [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 35, name: "Comedy" },
  ],
  "/api/v1/genres/tv": [
    { id: 18, name: "Drama" },
    { id: 80, name: "Crime" },
  ],
  "/api/v1/watchproviders/movies": [
    { id: 8, name: "Netflix", logoPath: "/netflix.png", displayPriority: 0 },
    { id: 337, name: "Disney Plus", logoPath: "/disney.png", displayPriority: 3 },
  ],
  "/api/v1/watchproviders/tv": [{ id: 8, name: "Netflix", logoPath: "/netflix.png" }],
  "/api/v1/discover/movies": page(movies),
  "/api/v1/discover/movies/upcoming": page([upcomingMovie]),
  "/api/v1/discover/tv": page(series),
  "/api/v1/discover/tv/upcoming": page(series),
  "/api/v1/discover/trending": page([...movies, ...series, person]),
} satisfies Readonly<Record<string, JsonValue>>;

function fixtureFor(pathname: string): JsonValue | undefined {
  return Object.entries(routes).find(([path]) => path === pathname)?.[1];
}

function send(response: ServerResponse, status: number, body: JsonValue) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function handle(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${seerrFixturePort}`);

  if (request.headers["x-api-key"] !== seerrFixtureApiKey) {
    send(response, 401, { message: "Unauthorized" });

    return;
  }

  const body = fixtureFor(url.pathname);

  if (body === undefined) {
    send(response, 404, { message: `No fixture for ${url.pathname}` });

    return;
  }

  send(response, 200, body);
}

createServer(handle).listen(seerrFixturePort, "127.0.0.1", () => {
  console.log(`Seerr fixture listening on http://127.0.0.1:${seerrFixturePort}`);
});
