/**
 * Minimal stand-in for the Seerr API used by browser tests. It serves deterministic fixtures for
 * the endpoints Disco reads, records mutations by user, and enforces session or explicit API-key user authentication.
 */
import { randomUUID } from "node:crypto";
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
  relatedVideos: [
    { site: "YouTube", type: "Trailer", url: "https://www.youtube.com/watch?v=fixture102" },
  ],
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
        profileName: "HD-1080p",
        profileId: 1,
        serverId: 0,
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
  profileId: Schema.optional(Schema.Number),
  serverId: Schema.optional(Schema.Number),
  is4k: Schema.optional(Schema.Boolean),
  seasons: Schema.optional(Schema.Union(Schema.Array(Schema.Number), Schema.Literal("all"))),
  tmdbId: Schema.optional(Schema.Number),
  title: Schema.optional(Schema.String),
});
type MutationBody = typeof MutationBody.Type;
const decodeMutationBody = Schema.decodeUnknownSync(Schema.parseJson(MutationBody));

/** Mutations recorded for assertions, exposed at `/__fixture/requests`. */
const recordedRequests: (MutationBody & { userId: number })[] = [];
const recordedWatchlist: ((MutationBody | Readonly<{ removed: string }>) & { userId: number })[] =
  [];
const users = [
  {
    id: 2,
    permissions: 8192,
    displayName: "Fixture User",
    email: "fixture@example.test",
    avatar: null,
  },
  { id: 3, permissions: 0, displayName: "Second User", email: "second@example.test", avatar: null },
];
const sessions = new Map<string, number>();
const rejectedLogouts = new Set<string>();
const csrfCookie = "fixture-csrf-secret";
const csrfToken = "fixture-csrf-token";
const LoginBody = Schema.Struct({
  email: Schema.optional(Schema.String),
  password: Schema.optional(Schema.String),
  authToken: Schema.optional(Schema.String),
});

function cookie(request: IncomingMessage, name: string): string | undefined {
  const pair = request.headers.cookie
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  return pair === undefined ? undefined : decodeURIComponent(pair.slice(name.length + 1));
}

function issueCsrf(response: ServerResponse) {
  response.setHeader("set-cookie", [
    `_csrf=${csrfCookie}; Path=/; HttpOnly`,
    `XSRF-TOKEN=${csrfToken}; Path=/`,
  ]);
}

function hasCsrf(request: IncomingMessage) {
  return cookie(request, "_csrf") === csrfCookie && request.headers["x-xsrf-token"] === csrfToken;
}

const staticRoutes = {
  "/api/v1/status": { version: "3.4.1" },
  "/api/v1/settings/public": {
    applicationTitle: "Seerr",
    applicationUrl: `http://127.0.0.1:${seerrFixturePort}`,
    discoverRegion: "AU",
    streamingRegion: "AU",
    hideAvailable: true,
    localLogin: true,
    mediaServerLogin: true,
    mediaServerType: 1,
  },
  "/api/v1/request/count": { total: 5, pending: 1, approved: 4, processing: 2, available: 2 },
  "/api/v1/genres/movie": [
    { id: 18, name: "Drama" },
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
  "/api/v1/watchproviders/regions": [
    { iso_3166_1: "AU", english_name: "Australia" },
    { iso_3166_1: "US", english_name: "United States of America" },
  ],
  "/api/v1/watchproviders/movies": [
    { id: 8, name: "Netflix", logoPath: "/netflix.png", displayPriority: 0 },
    { id: 337, name: "Disney Plus", logoPath: "/disney.png", displayPriority: 3 },
    { id: 21, name: "Stan", logoPath: "/stan.png", displayPriority: 5 },
  ],
  "/api/v1/watchproviders/tv": [{ id: 8, name: "Netflix", logoPath: "/netflix.png" }],
  "/api/v1/discover/movies": page([filmOne, filmTwo]),
  "/api/v1/discover/movies/upcoming": page([]),
  "/api/v1/discover/tv": page([seriesOne]),
  "/api/v1/discover/tv/upcoming": page([seriesOne]),
  "/api/v1/discover/trending": page([filmOne, filmTwo, seriesOne, person]),
  "/api/v1/search": page([seriesOne, person, filmTwo]),
  "/api/v1/person/301": {
    id: 301,
    name: "Fixture Person",
    biography: "A performer and filmmaker whose work spans movies and television.",
    birthday: "1960-05-12",
    placeOfBirth: "Brisbane",
    knownForDepartment: "Acting",
    profilePath: null,
  },
  "/api/v1/person/301/combined_credits": {
    id: 301,
    cast: [filmOne, seriesOne],
    crew: [filmOne, filmTwo],
  },
  "/api/v1/service/radarr": [
    { id: 0, name: "Movies", is4k: false, isDefault: true, activeProfileId: 1 },
  ],
  "/api/v1/service/radarr/0": {
    profiles: [
      { id: 1, name: "HD-1080p" },
      { id: 2, name: "Ultra-HD" },
    ],
  },
  "/api/v1/service/sonarr": [
    { id: 0, name: "TV", is4k: false, isDefault: true, activeProfileId: 1 },
  ],
  "/api/v1/service/sonarr/0": {
    profiles: [
      { id: 1, name: "HD-1080p" },
      { id: 2, name: "Ultra-HD" },
    ],
  },
  "/api/v1/search/keyword": { page: 1, results: [{ id: 10051, name: "heist" }] },
  "/api/v1/movie/102": filmTwoDetails,
  "/api/v1/movie/102/ratingscombined": {
    rt: { url: null, criticsScore: 91, audienceScore: 80 },
    imdb: { url: null, criticsScore: 7.9, criticsScoreCount: 1200 },
  },
  "/api/v1/movie/102/recommendations": page([filmOne]),
  "/api/v1/movie/1765392": {
    id: 1765392,
    title: "Call Me Tim",
    overview: "",
    posterPath: null,
    backdropPath: null,
    runtime: 0,
    releaseDate: "2026-09-15",
    status: "Released",
    originalLanguage: "en",
    genres: [],
    credits: { cast: [], crew: [] },
    voteCount: 0,
    voteAverage: 0,
    watchProviders: [],
  },
  "/api/v1/movie/1765392/ratingscombined": {},
  "/api/v1/movie/1765392/recommendations": page([]),
  "/api/v1/movie/1765393": { id: 1765393, title: "Title only" },
  "/api/v1/movie/1765393/ratingscombined": {},
  "/api/v1/movie/1765393/recommendations": page([]),
  "/api/v1/tv/201": seriesOneDetails,
  "/api/v1/tv/201/season/1": {
    episodes: [
      {
        id: 1001,
        episodeNumber: 1,
        name: "Arrival",
        overview: "A visitor arrives in town.",
        airDate: "2025-03-13",
        stillPath:
          "https://artworks.thetvdb.com/banners/v4/episode/8868133/screencap/61fcad53ee9f2.jpg",
      },
      {
        id: 1002,
        episodeNumber: 2,
        name: "The clue",
        overview: "A discovery changes the investigation.",
        airDate: "2025-03-20",
        stillPath: null,
      },
      {
        id: 1003,
        episodeNumber: 3,
        name: "Missing",
        overview: "The search continues.",
        airDate: "2025-03-27",
      },
      {
        id: 1004,
        episodeNumber: 4,
        name: "Outside",
        overview: "The truth finally comes to light.",
        airDate: "2025-04-03",
        stillPath: "/outside.jpg",
      },
    ],
  },
  "/api/v1/tv/201/season/2": {
    episodes: [
      {
        id: 2001,
        episodeNumber: 1,
        name: "Return",
        overview: "An old friend returns.",
        airDate: "2026-03-13",
        stillPath: "/return.jpg",
      },
      {
        id: 2002,
        episodeNumber: 2,
        name: "The crossing",
        overview: "A difficult choice awaits.",
        airDate: "2026-03-20",
      },
      {
        id: 2003,
        episodeNumber: 3,
        name: "Home",
        overview: "The journey home begins.",
        airDate: "2026-03-27",
      },
      {
        id: 2004,
        episodeNumber: 4,
        name: "Episode 4",
        overview: "",
        airDate: null,
        stillPath: null,
      },
    ],
  },
  "/api/v1/tv/202": {
    ...seriesOneDetails,
    id: 202,
    seasons: [
      { id: 3, seasonNumber: 3, name: "Season 3", episodeCount: 0 },
      { id: 4, seasonNumber: 4, name: "Season 4", episodeCount: 1 },
    ],
  },
  "/api/v1/tv/202/ratings": {},
  "/api/v1/tv/202/recommendations": page([]),
  "/api/v1/tv/202/season/3": { episodes: [] },
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
    pageInfo: { pages: 1, results: 3, page: 1 },
    results: [
      {
        id: 900,
        profileId: 1,
        serverId: 0,
        status: 2,
        type: "tv",
        createdAt: "2026-09-10T05:52:00.000Z",
        updatedAt: "2026-09-10T05:52:00.000Z",
        requestedBy: { id: 1, displayName: "Fixture User" },
        seasons: [{ seasonNumber: 1, status: 2 }],
        media: { tmdbId: 201, mediaType: "tv", status: 3 },
      },
      {
        id: 901,
        status: 3,
        type: "movie",
        createdAt: "2026-09-10T05:52:00.000Z",
        updatedAt: "2026-09-10T05:52:00.000Z",
        requestedBy: { id: 1, displayName: "Fixture User" },
        seasons: [],
        media: { tmdbId: 1765392, mediaType: "movie", status: 1 },
      },
      {
        id: 902,
        status: 5,
        type: "movie",
        createdAt: "2026-09-10T05:52:00.000Z",
        updatedAt: "2026-09-10T05:52:00.000Z",
        requestedBy: { id: 1, displayName: "Fixture User" },
        seasons: [],
        media: { tmdbId: 101, mediaType: "movie", status: 5 },
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

function readRawBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(raw);
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

  if (url.pathname === "/api/v1/settings/public" || url.pathname === "/api/v1/status") {
    if (request.headers["x-api-key"] !== undefined) {
      send(response, 400, { message: "Public endpoints must not receive an API key" });

      return;
    }

    issueCsrf(response);
    send(response, 200, fixtureFor(url.pathname));

    return;
  }

  if (url.pathname === "/api/v1/auth/local" || url.pathname === "/api/v1/auth/plex") {
    if (
      request.method !== "POST" ||
      request.headers["x-api-key"] !== undefined ||
      !hasCsrf(request)
    ) {
      send(response, 403, { message: "Invalid authentication request" });

      return;
    }

    const credentials = Schema.decodeUnknownSync(Schema.parseJson(LoginBody))(
      await readRawBody(request),
    );
    const plexUser = credentials.authToken === "fixture-plex-token" ? users[0] : undefined;
    const user = url.pathname.endsWith("/local")
      ? users.find(
          (candidate) =>
            candidate.email === credentials.email && credentials.password === "fixture-password",
        )
      : plexUser;

    if (user === undefined) {
      send(response, 403, { message: "Invalid credentials" });

      return;
    }

    const session = `s:${randomUUID()}.fixture-signature`;
    sessions.set(session, user.id);
    response.setHeader(
      "set-cookie",
      `connect.sid=${encodeURIComponent(session)}; Path=/; HttpOnly; Expires=Wed, 01 Jan 2031 00:00:00 GMT`,
    );
    send(response, 200, user);

    return;
  }

  const session = cookie(request, "connect.sid");
  const sessionUserId = session === undefined ? undefined : sessions.get(session);

  if (url.pathname === "/__fixture/expire") {
    if (session !== undefined) {
      sessions.delete(session);
    }

    send(response, 200, {});

    return;
  }

  if (url.pathname === "/__fixture/reject-logout") {
    if (session !== undefined) {
      rejectedLogouts.add(session);
    }

    send(response, 200, {});

    return;
  }

  const userId =
    request.headers["x-api-key"] === seerrFixtureApiKey
      ? Number(request.headers["x-api-user"])
      : sessionUserId;
  const user = users.find((candidate) => candidate.id === userId);

  if (user === undefined) {
    send(response, 403, { message: "Unauthorized" });

    return;
  }

  if (url.pathname === "/api/v1/auth/me") {
    issueCsrf(response);
    send(response, 200, user);

    return;
  }

  if (request.method !== "GET" && !hasCsrf(request)) {
    send(response, 403, { message: "Invalid CSRF token" });

    return;
  }

  if (url.pathname === "/api/v1/auth/logout" && request.method === "POST") {
    if (session !== undefined && rejectedLogouts.has(session)) {
      send(response, 403, { message: "Logout rejected" });

      return;
    }

    if (session !== undefined) {
      sessions.delete(session);
    }

    send(response, 200, { status: "ok" });

    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/request") {
    const body = decodeMutationBody(await readRawBody(request));

    if (body.mediaId === 104) {
      send(response, 403, { message: "Request rejected" });

      return;
    }

    recordedRequests.push({ ...body, userId: user.id });
    send(response, 201, { id: 1000 + recordedRequests.length, status: 2 });

    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/watchlist") {
    const body = decodeMutationBody(await readRawBody(request));
    recordedWatchlist.push({ ...body, userId: user.id });
    send(response, 200, body);

    return;
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/v1/watchlist/")) {
    recordedWatchlist.push({ removed: url.pathname.split("/").at(-1) ?? "", userId: user.id });
    send(response, 204, null);

    return;
  }

  if (
    url.pathname === "/api/v1/watchproviders/movies" &&
    url.searchParams.get("watchRegion") === "US"
  ) {
    send(response, 200, [
      { id: 8, name: "Netflix", logoPath: "/netflix.png", displayPriority: 0 },
      { id: 15, name: "Hulu", logoPath: "/hulu.png", displayPriority: 1 },
    ]);

    return;
  }

  if (url.pathname === "/api/v1/movie/104") {
    send(response, 200, { ...filmTwoDetails, id: 104, title: "Rejected Film" });

    return;
  }

  if (url.pathname === "/api/v1/movie/103") {
    send(response, 200, {
      ...filmTwoDetails,
      id: 103,
      title: "Refresh Film",
      mediaInfo: {
        tmdbId: 103,
        status: recordedRequests.some((entry) => entry.mediaId === 103) ? 3 : 1,
      },
    });

    return;
  }

  if (url.pathname === "/api/v1/search") {
    if (url.search.includes("+")) {
      send(response, 400, { message: "Parameter query must be url encoded" });

      return;
    }

    const query = url.searchParams.get("query");

    if (query === "no matches") {
      send(response, 200, page([]));

      return;
    }

    if (query === "search failure") {
      send(response, 503, { message: "Search unavailable" });

      return;
    }

    if (query === "rejected request") {
      send(response, 200, page([{ ...filmTwo, id: 104, title: "Rejected Film" }]));

      return;
    }

    if (query === "refresh request") {
      send(
        response,
        200,
        page([
          {
            ...filmTwo,
            id: 103,
            title: "Refresh Film",
            mediaInfo: {
              tmdbId: 103,
              status: recordedRequests.some((entry) => entry.mediaId === 103) ? 3 : 1,
            },
          },
        ]),
      );

      return;
    }

    if (query === "endless failure") {
      if (Number(url.searchParams.get("page")) > 1) {
        send(response, 503, { message: "Next page unavailable" });

        return;
      }

      send(response, 200, { page: 1, totalPages: 2, totalResults: 4, results: [filmOne, person] });

      return;
    }

    if (query === "endless") {
      const number = Number(url.searchParams.get("page"));
      send(response, 200, {
        page: number,
        totalPages: 3,
        totalResults: 4,
        results: [[filmOne, person], [person, filmTwo], [seriesOne]][number - 1] ?? [],
      });

      return;
    }
  }

  if (url.pathname === "/api/v1/discover/movies" && url.searchParams.get("genre") === "18") {
    send(response, 200, {
      page: Number(url.searchParams.get("page") ?? "1"),
      totalPages: 6,
      totalResults: 101,
      results: [filmOne, filmTwo],
    });

    return;
  }

  if (url.pathname === "/api/v1/discover/movies" && url.searchParams.get("genre") === "999") {
    send(response, 200, page([]));

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
