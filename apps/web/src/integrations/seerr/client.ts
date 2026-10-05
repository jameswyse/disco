import { Context, Effect, Layer, Redacted } from "effect";
import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import { seerrEnvironmentConfig } from "@/platform/configuration/seerrEnvironment";

import { SeerrMalformed, translateHttpError } from "./errors";
import { SeerrIdentity, csrfHeaders } from "./identity";
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
  PersonDetails,
  PersonCredits,
  RequestServers,
  ServiceProfiles,
  RequestCount,
  RequestListPage,
  RottenTomatoesRating,
  SeasonDetails,
  Status,
  TvDetails,
  TvResultPage,
  WatchProviderRegions,
  WatchProviders,
} from "./schemas";

import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";

import type { SeerrError } from "./errors";

export type MediaType = "movie" | "tv";

export type DiscoverSort =
  | "popularity.desc"
  | "primary_release_date.asc"
  | "primary_release_date.desc"
  | "first_air_date.asc"
  | "first_air_date.desc"
  | "vote_average.desc";

export type DiscoverQuery = Readonly<{
  page: number;
  sortBy: DiscoverSort;
  releasedAfter?: string;
  releasedBefore?: string;
  voteCountAtLeast?: number;
  voteAverageAtLeast?: number;
  genres?: readonly number[];
  originalLanguage?: string;
  keywords?: readonly number[];
  studio?: number;
  network?: number;
  watchRegion?: string;
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
  seasons?: readonly number[] | "all";
  serverId?: number;
  profileId?: number;
  is4k?: boolean;
}>;

export type WatchlistItem = Readonly<{ tmdbId: number; mediaType: MediaType; title: string }>;

type QueryValue = string | number | undefined;

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

function translateParseError(path: string, error: Schema.SchemaError): SeerrMalformed {
  return new SeerrMalformed({ path, description: error.message });
}

export class SeerrClient extends Context.Service<SeerrClient>()("SeerrClient", {
  make: Effect.gen(function* () {
    const environment = yield* seerrEnvironmentConfig;
    const apiBase = new URL("api/v1/", environment.origin);
    const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);

    const userClient = Effect.map(SeerrIdentity, (identity) =>
      httpClient.pipe(
        HttpClient.mapRequest(
          HttpClientRequest.setHeaders({
            ...csrfHeaders(identity.csrf),
            "X-Api-Key": Redacted.value(environment.apiKey),
            "X-API-User": String(identity.userId),
          }),
        ),
      ),
    );

    const decode =
      <A, I>(path: string, schema: Schema.Codec<A, I>) =>
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
                error._tag === "SchemaError"
                  ? translateParseError(path, error)
                  : translateHttpError(path, error),
              ),
            ),
          ),
        );

    const get = <A, I>(
      path: string,
      schema: Schema.Codec<A, I>,
      parameters: QueryParameters = {},
    ): Effect.Effect<A, SeerrError, SeerrIdentity> =>
      Effect.flatMap(userClient, (client) =>
        client
          .get(
            new URL(
              `${path}?${new URLSearchParams(definedParameters(parameters)).toString().replaceAll("+", "%20")}`,
              apiBase,
            ).toString(),
          )
          .pipe(decode(path, schema)),
      );

    const post = <A, I>(
      path: string,
      schema: Schema.Codec<A, I>,
      body: unknown,
    ): Effect.Effect<A, SeerrError, SeerrIdentity> =>
      Effect.flatMap(userClient, (client) =>
        client
          .post(new URL(path, apiBase), { body: HttpBody.jsonUnsafe(body) })
          .pipe(decode(path, schema)),
      );

    const del = (
      path: string,
      parameters: QueryParameters = {},
    ): Effect.Effect<void, SeerrError, SeerrIdentity> =>
      Effect.flatMap(userClient, (client) =>
        client.del(new URL(path, apiBase), { urlParams: definedParameters(parameters) }).pipe(
          Effect.mapError((error) => translateHttpError(path, error)),
          Effect.asVoid,
        ),
      );

    return {
      origin: environment.origin,
      status: () => httpClient.get(new URL("status", apiBase)).pipe(decode("status", Status)),
      publicSettings: () =>
        httpClient
          .get(new URL("settings/public", apiBase))
          .pipe(decode("settings/public", PublicSettings)),
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
      requestServers: (mediaType: MediaType) =>
        get(`service/${mediaType === "movie" ? "radarr" : "sonarr"}`, RequestServers),
      serviceProfiles: (mediaType: MediaType, serverId: number) =>
        get(`service/${mediaType === "movie" ? "radarr" : "sonarr"}/${serverId}`, ServiceProfiles),
      createRequest: (body: CreateRequestBody) => post("request", CreatedRequest, body),
      addToWatchlist: (item: WatchlistItem) => post("watchlist", NoContent, item),
      removeFromWatchlist: (tmdbId: number, mediaType: MediaType) =>
        del(`watchlist/${tmdbId}`, { mediaType }),
      addToBlocklist: (item: WatchlistItem) =>
        Effect.gen(function* () {
          const identity = yield* SeerrIdentity;
          const client = yield* userClient;

          yield* client
            .post(new URL("blocklist", apiBase), {
              body: HttpBody.jsonUnsafe({ ...item, user: identity.userId }),
            })
            .pipe(Effect.mapError((error) => translateHttpError("blocklist", error)));
        }),
      removeFromBlocklist: (tmdbId: number, mediaType: MediaType) =>
        del(`blocklist/${tmdbId}`, { mediaType }),
      genres: (mediaType: MediaType) => get(`genres/${mediaType}`, Genres),
      genreSlider: (mediaType: MediaType) => get(`discover/genreslider/${mediaType}`, GenreSlider),
      languages: () => get("languages", Languages),
      network: (id: number) => get(`network/${id}`, Company),
      studio: (id: number) => get(`studio/${id}`, Company),
      searchKeywords: (query: string) => get("search/keyword", KeywordPage, { query }),
      watchProviderRegions: () => get("watchproviders/regions", WatchProviderRegions),
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
      person: (id: number) => get(`person/${id}`, PersonDetails),
      personCredits: (id: number) => get(`person/${id}/combined_credits`, PersonCredits),
      movie: (id: number) => get(`movie/${id}`, MovieDetails),
      tv: (id: number) => get(`tv/${id}`, TvDetails),
      tvSeason: (id: number, season: number) => get(`tv/${id}/season/${season}`, SeasonDetails),
      movieRatings: (id: number) => get(`movie/${id}/ratingscombined`, CombinedRatings),
      tvRatings: (id: number) => get(`tv/${id}/ratings`, RottenTomatoesRating),
      recommendations: (mediaType: MediaType, id: number) =>
        mediaType === "movie"
          ? get(`movie/${id}/recommendations`, MovieResultPage, { page: 1 })
          : get(`tv/${id}/recommendations`, TvResultPage, { page: 1 }),
    };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(Layer.provide(FetchHttpClient.layer));
}
