import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Effect, Redacted } from "effect";

import { seerrEnvironmentConfig } from "@/platform/configuration/seerrEnvironment";

import { SeerrMalformed, SeerrRejected, SeerrUnavailable } from "./errors";
import {
  CurrentUser,
  Genres,
  MediaResultPage,
  MovieResultPage,
  PublicSettings,
  RequestCount,
  Status,
  TvResultPage,
  WatchProviders,
} from "./schemas";

import type { HttpClientError } from "@effect/platform";
import type { ParseResult, Schema } from "effect";

import type { SeerrError } from "./errors";

export type MediaType = "movie" | "tv";

export type DiscoverSort =
  | "popularity.desc"
  | "primary_release_date.asc"
  | "primary_release_date.desc"
  | "first_air_date.asc"
  | "first_air_date.desc"
  | "vote_average.desc";

/** Query for Seerr's `/discover/movies` and `/discover/tv`, which proxy TMDB discover. */
export type DiscoverQuery = Readonly<{
  page: number;
  sortBy: DiscoverSort;
  /** ISO date (YYYY-MM-DD) bounds on release / first-air date. */
  releasedAfter?: string;
  releasedBefore?: string;
  voteCountAtLeast?: number;
  watchRegion?: string;
  /** TMDB watch provider ids, matched as "any of". */
  watchProviders?: readonly number[];
}>;

export type TrendingQuery = Readonly<{ page: number; mediaType: MediaType | "all" }>;

type QueryValue = string | number | undefined;
/** Query-string parameters before empty values are dropped. */
type QueryParameters = Readonly<Record<string, QueryValue>>;

function discoverParameters(mediaType: MediaType, query: DiscoverQuery) {
  const dateParameter = mediaType === "movie" ? "primaryReleaseDate" : "firstAirDate";

  return {
    page: query.page,
    sortBy: query.sortBy,
    [`${dateParameter}Gte`]: query.releasedAfter,
    [`${dateParameter}Lte`]: query.releasedBefore,
    voteCountGte: query.voteCountAtLeast,
    watchRegion: query.watchRegion,
    watchProviders: query.watchProviders?.join("|"),
  } satisfies QueryParameters;
}

function definedParameters(parameters: QueryParameters): [string, string][] {
  return Object.entries(parameters).flatMap(([name, value]): [string, string][] =>
    value === undefined ? [] : [[name, String(value)]],
  );
}

function translateHttpError(path: string, error: HttpClientError.HttpClientError): SeerrError {
  if (error._tag === "ResponseError") {
    return new SeerrRejected({ path, status: error.response.status });
  }

  return new SeerrUnavailable({ path, cause: error.cause });
}

function translateParseError(path: string, error: ParseResult.ParseError): SeerrMalformed {
  return new SeerrMalformed({ path, description: error.message });
}

export class SeerrClient extends Effect.Service<SeerrClient>()("SeerrClient", {
  dependencies: [FetchHttpClient.layer],
  effect: Effect.gen(function* () {
    const environment = yield* seerrEnvironmentConfig;
    const apiBase = new URL("api/v1/", environment.origin);
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
      HttpClient.mapRequest(
        HttpClientRequest.setHeader("X-Api-Key", Redacted.value(environment.apiKey)),
      ),
    );

    const get = <A, I>(
      path: string,
      schema: Schema.Schema<A, I>,
      parameters: QueryParameters = {},
    ): Effect.Effect<A, SeerrError> =>
      httpClient.get(new URL(path, apiBase), { urlParams: definedParameters(parameters) }).pipe(
        Effect.mapError((error) => translateHttpError(path, error)),
        Effect.flatMap((response) =>
          HttpClientResponse.schemaBodyJson(schema)(response).pipe(
            Effect.mapError((error) =>
              error._tag === "ParseError"
                ? translateParseError(path, error)
                : translateHttpError(path, error),
            ),
          ),
        ),
      );

    return {
      /** Public origin of the Seerr instance, for linking into its UI. */
      origin: environment.origin,
      status: () => get("status", Status),
      publicSettings: () => get("settings/public", PublicSettings),
      currentUser: () => get("auth/me", CurrentUser),
      requestCount: () => get("request/count", RequestCount),
      genres: (mediaType: MediaType) => get(`genres/${mediaType}`, Genres),
      watchProviders: (mediaType: MediaType, region: string) =>
        get(`watchproviders/${mediaType === "movie" ? "movies" : "tv"}`, WatchProviders, {
          watchRegion: region,
        }),
      discoverMovies: (query: DiscoverQuery) =>
        get("discover/movies", MovieResultPage, discoverParameters("movie", query)),
      discoverTv: (query: DiscoverQuery) =>
        get("discover/tv", TvResultPage, discoverParameters("tv", query)),
      upcomingMovies: (page: number) => get("discover/movies/upcoming", MovieResultPage, { page }),
      upcomingTv: (page: number) => get("discover/tv/upcoming", TvResultPage, { page }),
      trending: (query: TrendingQuery) =>
        get("discover/trending", MediaResultPage, {
          page: query.page,
          mediaType: query.mediaType,
          timeWindow: "week",
        }),
    };
  }),
}) {}
