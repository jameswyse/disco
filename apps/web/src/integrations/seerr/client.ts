import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Effect, Redacted } from "effect";

import { seerrEnvironmentConfig } from "@/platform/configuration/seerrEnvironment";

import { SeerrMalformed, SeerrRejected, SeerrUnavailable } from "./errors";
import {
  CombinedRatings,
  Company,
  CreatedRequest,
  CurrentUser,
  Genres,
  GenreSlider,
  KeywordPage,
  Languages,
  MediaResultPage,
  MovieDetails,
  MovieResultPage,
  NoContent,
  PublicSettings,
  RequestCount,
  RequestListPage,
  RottenTomatoesRating,
  Status,
  TvDetails,
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
  voteAverageAtLeast?: number;
  /** TMDB genre ids, matched as "any of". */
  genres?: readonly number[];
  /** ISO 639-1 original-language code. */
  originalLanguage?: string;
  /** TMDB keyword ids, matched as "all of". */
  keywords?: readonly number[];
  /** TMDB production company id (movies only). */
  studio?: number;
  /** TMDB network id (series only). */
  network?: number;
  watchRegion?: string;
  /** TMDB watch provider ids, matched as "any of". */
  watchProviders?: readonly number[];
}>;

export type TrendingQuery = Readonly<{ page: number; mediaType: MediaType | "all" }>;

export type RequestListQuery = Readonly<{
  take: number;
  skip: number;
  filter: "all" | "pending" | "approved" | "processing" | "available" | "unavailable";
}>;

export type CreateRequestBody = Readonly<{
  mediaType: MediaType;
  mediaId: number;
  /** Season numbers for a partial series request, or every season. */
  seasons?: readonly number[] | "all";
}>;

export type WatchlistItem = Readonly<{ tmdbId: number; mediaType: MediaType; title: string }>;

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
    voteAverageGte: query.voteAverageAtLeast,
    genre: query.genres?.join(","),
    language: query.originalLanguage,
    keywords: query.keywords?.join(","),
    studio: mediaType === "movie" ? query.studio : undefined,
    network: mediaType === "tv" ? query.network : undefined,
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

    const decode =
      <A, I>(path: string, schema: Schema.Schema<A, I>) =>
      (
        response: Effect.Effect<
          HttpClientResponse.HttpClientResponse,
          HttpClientError.HttpClientError
        >,
      ): Effect.Effect<A, SeerrError> =>
        response.pipe(
          Effect.mapError((error) => translateHttpError(path, error)),
          Effect.flatMap((incoming) =>
            HttpClientResponse.schemaBodyJson(schema)(incoming).pipe(
              Effect.mapError((error) =>
                error._tag === "ParseError"
                  ? translateParseError(path, error)
                  : translateHttpError(path, error),
              ),
            ),
          ),
        );

    const get = <A, I>(
      path: string,
      schema: Schema.Schema<A, I>,
      parameters: QueryParameters = {},
    ): Effect.Effect<A, SeerrError> =>
      httpClient
        .get(new URL(path, apiBase), { urlParams: definedParameters(parameters) })
        .pipe(decode(path, schema));

    const post = <A, I>(
      path: string,
      schema: Schema.Schema<A, I>,
      body: unknown,
    ): Effect.Effect<A, SeerrError> =>
      httpClient
        .post(new URL(path, apiBase), { body: HttpBody.unsafeJson(body) })
        .pipe(decode(path, schema));

    const del = (path: string, parameters: QueryParameters = {}): Effect.Effect<void, SeerrError> =>
      httpClient.del(new URL(path, apiBase), { urlParams: definedParameters(parameters) }).pipe(
        Effect.mapError((error) => translateHttpError(path, error)),
        Effect.asVoid,
      );

    return {
      /** Public origin of the Seerr instance, for linking into its UI. */
      origin: environment.origin,
      status: () => get("status", Status),
      publicSettings: () => get("settings/public", PublicSettings),
      currentUser: () => get("auth/me", CurrentUser),
      requestCount: () => get("request/count", RequestCount),
      requests: (query: RequestListQuery) =>
        get("request", RequestListPage, {
          take: query.take,
          skip: query.skip,
          filter: query.filter,
          sort: "added",
          sortDirection: "desc",
        }),
      createRequest: (body: CreateRequestBody) => post("request", CreatedRequest, body),
      addToWatchlist: (item: WatchlistItem) => post("watchlist", NoContent, item),
      removeFromWatchlist: (tmdbId: number, mediaType: MediaType) =>
        del(`watchlist/${tmdbId}`, { mediaType }),
      genres: (mediaType: MediaType) => get(`genres/${mediaType}`, Genres),
      genreSlider: (mediaType: MediaType) => get(`discover/genreslider/${mediaType}`, GenreSlider),
      languages: () => get("languages", Languages),
      network: (id: number) => get(`network/${id}`, Company),
      studio: (id: number) => get(`studio/${id}`, Company),
      searchKeywords: (query: string) => get("search/keyword", KeywordPage, { query }),
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
      search: (query: string, page: number) => get("search", MediaResultPage, { query, page }),
      movie: (id: number) => get(`movie/${id}`, MovieDetails),
      tv: (id: number) => get(`tv/${id}`, TvDetails),
      movieRatings: (id: number) => get(`movie/${id}/ratingscombined`, CombinedRatings),
      tvRatings: (id: number) => get(`tv/${id}/ratings`, RottenTomatoesRating),
      recommendations: (mediaType: MediaType, id: number) =>
        mediaType === "movie"
          ? get(`movie/${id}/recommendations`, MovieResultPage, { page: 1 })
          : get(`tv/${id}/recommendations`, TvResultPage, { page: 1 }),
    };
  }),
}) {}
