import { Schema } from "effect";

/** Optional string fields that Seerr may omit, null, or send as an empty string. */
const OptionalText = Schema.optional(Schema.NullOr(Schema.String));
const OptionalNumber = Schema.optional(Schema.NullOr(Schema.Number));

export const MediaInfo = Schema.Struct({
  tmdbId: Schema.Number,
  /** 1 unknown, 2 pending, 3 processing, 4 partially available, 5 available, 6 deleted. */
  status: Schema.Number,
  mediaUrl: OptionalText,
});
export type MediaInfo = typeof MediaInfo.Type;

const ResultBase = {
  id: Schema.Number,
  posterPath: OptionalText,
  backdropPath: OptionalText,
  overview: OptionalText,
  originalLanguage: OptionalText,
  popularity: OptionalNumber,
  voteAverage: OptionalNumber,
  voteCount: OptionalNumber,
  genreIds: Schema.optional(Schema.Array(Schema.Number)),
  mediaInfo: Schema.optional(Schema.NullOr(MediaInfo)),
};

export const MovieResult = Schema.Struct({
  ...ResultBase,
  mediaType: Schema.Literal("movie"),
  title: Schema.String,
  releaseDate: OptionalText,
});
export type MovieResult = typeof MovieResult.Type;

export const TvResult = Schema.Struct({
  ...ResultBase,
  mediaType: Schema.Literal("tv"),
  name: Schema.String,
  firstAirDate: OptionalText,
  originCountry: Schema.optional(Schema.Array(Schema.String)),
});
export type TvResult = typeof TvResult.Type;

/** Trending can include people; they are decoded so the page parses and then dropped. */
export const PersonResult = Schema.Struct({
  id: Schema.Number,
  mediaType: Schema.Literal("person"),
});

export const MediaResult = Schema.Union(MovieResult, TvResult, PersonResult);
export type MediaResult = typeof MediaResult.Type;

export function ResultPage<Item extends Schema.Schema.Any>(item: Item) {
  return Schema.Struct({
    page: Schema.Number,
    totalPages: Schema.Number,
    totalResults: Schema.Number,
    results: Schema.Array(item),
  });
}

export const MovieResultPage = ResultPage(MovieResult);
export type MovieResultPage = typeof MovieResultPage.Type;
export const TvResultPage = ResultPage(TvResult);
export type TvResultPage = typeof TvResultPage.Type;
export const MediaResultPage = ResultPage(MediaResult);
export type MediaResultPage = typeof MediaResultPage.Type;

export const WatchProvider = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  logoPath: OptionalText,
  displayPriority: OptionalNumber,
});
export type WatchProvider = typeof WatchProvider.Type;
export const WatchProviders = Schema.Array(WatchProvider);

export const Genre = Schema.Struct({ id: Schema.Number, name: Schema.String });
export type Genre = typeof Genre.Type;
export const Genres = Schema.Array(Genre);

export const RequestCount = Schema.Struct({
  total: Schema.Number,
  pending: Schema.Number,
  approved: Schema.Number,
  processing: Schema.Number,
  available: Schema.Number,
});
export type RequestCount = typeof RequestCount.Type;

export const CurrentUser = Schema.Struct({
  id: Schema.Number,
  displayName: Schema.String,
  avatar: OptionalText,
});
export type CurrentUser = typeof CurrentUser.Type;

export const PublicSettings = Schema.Struct({
  applicationTitle: Schema.String,
  applicationUrl: OptionalText,
  discoverRegion: OptionalText,
  streamingRegion: OptionalText,
  hideAvailable: Schema.optional(Schema.Boolean),
});
export type PublicSettings = typeof PublicSettings.Type;

export const Status = Schema.Struct({ version: Schema.String });
export type Status = typeof Status.Type;
