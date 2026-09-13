/**
 * Minimal stand-in for the Seerr API used by browser tests. It serves deterministic fixtures for
 * the endpoints Disco reads, records mutations, and rejects requests without the fixture API key.
 */
import { createServer } from "node:http";

import { Schema } from "effect";

import { seerrFixtureApiKey, seerrFixturePort } from "../browserTestEnvironment.ts";

import type { IncomingMessage, ServerResponse } from "node:http";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const mediaInfo = (tmdbId: number, status: number) => ({
  tmdbId,
  status,
  mediaUrl: status === 5 ? `https://plex.example.test/${tmdbId}` : null,
  downloadStatus: [],
  requests: [],
});

const filmOne = {
  id: 101,
  mediaType: "movie",
  title: "Fixture Film One",
  releaseDate: "2026-07-08",
  posterPath: "/fixture-film-one.jpg",
  backdropPath: "/fixture-film-one-backdrop.jpg",
  overview: "A film from the fixture server.",
  voteAverage: 7.14,
  voteCount: 561,
  popularity: 326.2,
  genreIds: [28, 12],
  mediaInfo: mediaInfo(101, 5),
} satisfies JsonValue;

const filmTwo = {
  id: 102,
  mediaType: "movie",
  title: "Fixture Film Two",
  releaseDate: "2026-09-01",
  posterPath: null,
  overview: "A second film that nobody has requested yet.",
  voteAverage: 6.5,
  voteCount: 3,
  popularity: 120,
  genreIds: [35],
} satisfies JsonValue;

const seriesOne = {
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
} satisfies JsonValue;

const person = { id: 301, mediaType: "person", name: "Fixture Person" } satisfies JsonValue;

function page(results: readonly JsonValue[]): JsonValue {
  return { page: 1, totalPages: 1, totalResults: results.length, results: [...results] };
}

const credits = {
  cast: [
    { id: 1, name: "Fixture Actor", character: "Lead", profilePath: null, order: 0 },
    { id: 2, name: "Another Actor", character: "Support", profilePath: null, order: 1 },
  ],
  crew: [{ id: 3, name: "Fixture Director", job: "Director", department: "Directing" }],
} satisfies JsonValue;

const filmTwoDetails = {
  id: 102,
  title: "Fixture Film Two",
  tagline: "Not yet requested.",
  overview: "A second film that nobody has requested yet.",
  releaseDate: "2026-09-01",
  runtime: 118,
  posterPath: null,
  backdropPath: null,
  genres: [{ id: 35, name: "Comedy" }],
  originalLanguage: "en",
  spokenLanguages: [{ iso_639_1: "en", english_name: "English", name: "English" }],
  productionCountries: [{ iso_3166_1: "AU", name: "Australia" }],
  productionCompanies: [{ id: 41077, name: "A24", logoPath: null }],
  status: "Released",
  voteAverage: 6.5,
  voteCount: 3,
  credits,
  keywords: [{ id: 1, name: "fixture" }],
  releases: { results: [{ iso_3166_1: "AU", release_dates: [{ certification: "M", type: 3 }] }] },
  watchProviders: [
    {
      iso_3166_1: "AU",
      link: null,
      flatrate: [{ id: 8, name: "Netflix", logoPath: "/netflix.png" }],
    },
  ],
  mediaInfo: null,
  onUserWatchlist: false,
  externalIds: { imdbId: "tt0000102" },
} satisfies JsonValue;

const seriesOneDetails = {
  id: 201,
  name: "Fixture Series One",
  tagline: "Every episode in the fixture.",
  overview: "A series from the fixture server.",
  firstAirDate: "2025-03-13",
  numberOfSeasons: 2,
  numberOfEpisodes: 8,
  episodeRunTime: [60],
  type: "Miniseries",
  status: "Ended",
  posterPath: "/fixture-series-one.jpg",
  backdropPath: "/fixture-series-one-backdrop.jpg",
  genres: [
    { id: 18, name: "Drama" },
    { id: 80, name: "Crime" },
  ],
  originalLanguage: "en",
  originCountry: ["GB"],
  networks: [{ id: 213, name: "Netflix", logoPath: "/netflix-wordmark.png" }],
  createdBy: [{ id: 9, name: "Fixture Creator" }],
  credits,
  seasons: [
    { id: 1, seasonNumber: 1, name: "Season 1", episodeCount: 4, airDate: "2025-03-13" },
    { id: 2, seasonNumber: 2, name: "Season 2", episodeCount: 4, airDate: "2026-03-13" },
  ],
  contentRatings: { results: [{ iso_3166_1: "AU", rating: "MA 15+" }] },
  voteAverage: 8.2,
  voteCount: 2100,
  mediaInfo: {
    ...mediaInfo(201, 3),
    seasons: [
      { seasonNumber: 1, status: 3 },
      { seasonNumber: 2, status: 1 },
    ],
    requests: [
      {
        id: 900,
        status: 2,
        type: "tv",
        createdAt: "2026-09-10T05:52:00.000Z",
        updatedAt: "2026-09-10T05:52:00.000Z",
        requestedBy: { id: 1, displayName: "Fixture User" },
        seasons: [{ seasonNumber: 1, status: 2 }],
      },
    ],
  },
  onUserWatchlist: false,
  externalIds: { imdbId: "tt0000201", tvdbId: 4444 },
} satisfies JsonValue;

/** Bodies Disco sends to Seerr's request and watchlist endpoints. */
const MutationBody = Schema.Struct({
  mediaType: Schema.optional(Schema.String),
  mediaId: Schema.optional(Schema.Number),
  seasons: Schema.optional(Schema.Union(Schema.Array(Schema.Number), Schema.Literal("all"))),
  tmdbId: Schema.optional(Schema.Number),
  title: Schema.optional(Schema.String),
});
type MutationBody = typeof MutationBody.Type;
const decodeMutationBody = Schema.decodeUnknownSync(Schema.parseJson(MutationBody));

/** Mutations recorded for assertions, exposed at `/__fixture/requests`. */
const recordedRequests: MutationBody[] = [];
const recordedWatchlist: (MutationBody | Readonly<{ removed: string }>)[] = [];

const staticRoutes = {
  "/api/v1/status": { version: "3.4.1" },
  "/api/v1/settings/public": {
    applicationTitle: "Seerr",
    applicationUrl: `http://127.0.0.1:${seerrFixturePort}`,
    discoverRegion: "AU",
    streamingRegion: "AU",
    hideAvailable: true,
  },
  "/api/v1/auth/me": { id: 1, displayName: "Fixture User", avatar: null },
  "/api/v1/request/count": { total: 5, pending: 1, approved: 4, processing: 2, available: 2 },
  "/api/v1/genres/movie": [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 35, name: "Comedy" },
  ],
  "/api/v1/genres/tv": [
    { id: 18, name: "Drama" },
    { id: 80, name: "Crime" },
  ],
  "/api/v1/discover/genreslider/movie": [
    { id: 28, name: "Action", backdrops: ["/action.jpg"] },
    { id: 35, name: "Comedy", backdrops: [] },
  ],
  "/api/v1/discover/genreslider/tv": [{ id: 18, name: "Drama", backdrops: ["/drama.jpg"] }],
  "/api/v1/languages": [
    { iso_639_1: "en", english_name: "English", name: "English" },
    { iso_639_1: "ko", english_name: "Korean", name: "한국어/조선말" },
  ],
  "/api/v1/watchproviders/movies": [
    { id: 8, name: "Netflix", logoPath: "/netflix.png", displayPriority: 0 },
    { id: 337, name: "Disney Plus", logoPath: "/disney.png", displayPriority: 3 },
    { id: 21, name: "Stan", logoPath: "/stan.png", displayPriority: 5 },
  ],
  "/api/v1/watchproviders/tv": [{ id: 8, name: "Netflix", logoPath: "/netflix.png" }],
  "/api/v1/discover/movies": page([filmOne, filmTwo]),
  "/api/v1/discover/movies/upcoming": page([filmTwo]),
  "/api/v1/discover/tv": page([seriesOne]),
  "/api/v1/discover/tv/upcoming": page([seriesOne]),
  "/api/v1/discover/trending": page([filmOne, filmTwo, seriesOne, person]),
  "/api/v1/search": page([seriesOne, person, filmTwo]),
  "/api/v1/search/keyword": { page: 1, results: [{ id: 10051, name: "heist" }] },
  "/api/v1/movie/102": filmTwoDetails,
  "/api/v1/movie/102/ratingscombined": {
    rt: { url: null, criticsScore: 91, audienceScore: 80 },
    imdb: { url: null, criticsScore: 7.9, criticsScoreCount: 1200 },
  },
  "/api/v1/movie/102/recommendations": page([filmOne]),
  "/api/v1/tv/201": seriesOneDetails,
  "/api/v1/tv/201/ratings": { url: null, criticsScore: 97, audienceScore: 74 },
  "/api/v1/tv/201/recommendations": page([]),
  "/api/v1/movie/101": {
    ...filmTwoDetails,
    id: 101,
    title: "Fixture Film One",
    mediaInfo: mediaInfo(101, 5),
  },
  "/api/v1/movie/101/ratingscombined": {},
  "/api/v1/movie/101/recommendations": page([]),
  "/api/v1/request": {
    pageInfo: { pages: 1, results: 1, page: 1 },
    results: [
      {
        id: 900,
        status: 2,
        type: "tv",
        createdAt: "2026-09-10T05:52:00.000Z",
        updatedAt: "2026-09-10T05:52:00.000Z",
        requestedBy: { id: 1, displayName: "Fixture User" },
        seasons: [{ seasonNumber: 1, status: 2 }],
        media: { tmdbId: 201, mediaType: "tv", status: 3 },
      },
    ],
  },
} satisfies Readonly<Record<string, JsonValue>>;

const companies = new Map<string, JsonValue>([
  ["/api/v1/network/213", { id: 213, name: "Netflix", logoPath: "/netflix-wordmark.png" }],
  ["/api/v1/network/49", { id: 49, name: "HBO", logoPath: "/hbo.png" }],
  ["/api/v1/studio/41077", { id: 41077, name: "A24", logoPath: "/a24.png" }],
]);

function fixtureFor(pathname: string): JsonValue | undefined {
  const known = companies.get(pathname);

  if (known !== undefined) {
    return known;
  }

  if (/^\/api\/v1\/(network|studio)\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));

    return { id, name: `Company ${id}`, logoPath: null };
  }

  return Object.entries(staticRoutes).find(([path]) => path === pathname)?.[1];
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<MutationBody> {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(decodeMutationBody(raw));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    request.on("error", reject);
  });
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${seerrFixturePort}`);

  if (url.pathname === "/__fixture/requests") {
    send(response, 200, { requests: recordedRequests, watchlist: recordedWatchlist });

    return;
  }

  if (request.headers["x-api-key"] !== seerrFixtureApiKey) {
    send(response, 401, { message: "Unauthorized" });

    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/request") {
    const body = await readBody(request);
    recordedRequests.push(body);
    send(response, 201, { id: 1000 + recordedRequests.length, status: 2 });

    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/watchlist") {
    const body = await readBody(request);
    recordedWatchlist.push(body);
    send(response, 200, body);

    return;
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/v1/watchlist/")) {
    recordedWatchlist.push({ removed: url.pathname.split("/").at(-1) ?? "" });
    send(response, 204, null);

    return;
  }

  const body = fixtureFor(url.pathname);

  if (body === undefined) {
    send(response, 404, { message: `No fixture for ${url.pathname}` });

    return;
  }

  send(response, 200, body);
}

createServer((request, response) => {
  handle(request, response).catch((error: unknown) => {
    send(response, 500, { message: error instanceof Error ? error.message : "Fixture failure" });
  });
}).listen(seerrFixturePort, "127.0.0.1", () => {
  console.log(`Seerr fixture listening on http://127.0.0.1:${seerrFixturePort}`);
});
