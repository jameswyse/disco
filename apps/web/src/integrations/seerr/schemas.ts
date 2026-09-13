import { Schema } from "effect";

/** Optional string fields that Seerr may omit, null, or send as an empty string. */
const OptionalText = Schema.optional(Schema.NullOr(Schema.String));
const OptionalNumber = Schema.optional(Schema.NullOr(Schema.Number));
const OptionalBoolean = Schema.optional(Schema.NullOr(Schema.Boolean));

export const DownloadStatus = Schema.Struct({
  title: OptionalText,
  status: OptionalText,
  size: OptionalNumber,
  sizeLeft: OptionalNumber,
  timeLeft: OptionalText,
  estimatedCompletionTime: OptionalText,
  episode: Schema.optional(
    Schema.NullOr(Schema.Struct({ seasonNumber: Schema.Number, episodeNumber: Schema.Number })),
  ),
});
export type DownloadStatus = typeof DownloadStatus.Type;

export const RequestUser = Schema.Struct({
  id: Schema.Number,
  displayName: Schema.String,
});

/** A Seerr media request. `status`: 1 pending approval, 2 approved, 3 declined, 4 failed, 5 completed. */
export const MediaRequest = Schema.Struct({
  id: Schema.Number,
  status: Schema.Number,
  type: Schema.Literal("movie", "tv"),
  is4k: OptionalBoolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  requestedBy: Schema.optional(Schema.NullOr(RequestUser)),
  seasons: Schema.optional(
    Schema.Array(Schema.Struct({ seasonNumber: Schema.Number, status: Schema.Number })),
  ),
});
export type MediaRequest = typeof MediaRequest.Type;

export const MediaSeasonInfo = Schema.Struct({
  seasonNumber: Schema.Number,
  status: Schema.Number,
});

export const MediaInfo = Schema.Struct({
  tmdbId: Schema.Number,
  /** 1 unknown, 2 pending, 3 processing, 4 partially available, 5 available, 6 deleted. */
  status: Schema.Number,
  mediaUrl: OptionalText,
  mediaAddedAt: OptionalText,
  downloadStatus: Schema.optional(Schema.Array(DownloadStatus)),
  requests: Schema.optional(Schema.Array(MediaRequest)),
  seasons: Schema.optional(Schema.Array(MediaSeasonInfo)),
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

/** Search and trending can include people; they are decoded so the page parses and then dropped. */
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

export const GenreWithBackdrops = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  backdrops: Schema.optional(Schema.Array(Schema.String)),
});
export const GenreSlider = Schema.Array(GenreWithBackdrops);

export const Language = Schema.Struct({
  iso_639_1: Schema.String,
  english_name: Schema.String,
  name: OptionalText,
});
export type Language = typeof Language.Type;
export const Languages = Schema.Array(Language);

export const Keyword = Schema.Struct({ id: Schema.Number, name: Schema.String });
export type Keyword = typeof Keyword.Type;
export const KeywordPage = Schema.Struct({ results: Schema.Array(Keyword) });

/** Shared by `/network/{id}` and `/studio/{id}`. */
export const Company = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  logoPath: OptionalText,
});
export type Company = typeof Company.Type;

export const RequestCount = Schema.Struct({
  total: Schema.Number,
  pending: Schema.Number,
  approved: Schema.Number,
  processing: Schema.Number,
  available: Schema.Number,
});
export type RequestCount = typeof RequestCount.Type;

export const SeerrUserId = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
  Schema.brand("SeerrUserId"),
);
export type SeerrUserId = typeof SeerrUserId.Type;

export const CurrentUser = Schema.Struct({
  id: SeerrUserId,
  displayName: Schema.String,
  avatar: OptionalText,
});
export type CurrentUser = typeof CurrentUser.Type;

export const LoginSettings = Schema.Union(
  Schema.Struct({
    localLogin: Schema.Literal(true),
    mediaServerLogin: Schema.Boolean,
    mediaServerType: Schema.Literal(1, 2, 3, 4),
  }),
  Schema.Struct({
    localLogin: Schema.Literal(false),
    mediaServerLogin: Schema.Literal(true),
    mediaServerType: Schema.Literal(1, 2, 3, 4),
  }),
);
export type LoginSettings = typeof LoginSettings.Type;

const ApplicationUrl = Schema.String.pipe(
  Schema.filter((value) => {
    if (value === "") {
      return true;
    }

    try {
      const url = new URL(value);

      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }),
);

export const PublicSettings = Schema.Struct({
  applicationTitle: Schema.String,
  applicationUrl: Schema.optional(Schema.NullOr(ApplicationUrl)),
  discoverRegion: OptionalText,
  streamingRegion: OptionalText,
  hideAvailable: Schema.optional(Schema.Boolean),
  partialRequestsEnabled: Schema.optional(Schema.Boolean),
}).pipe(Schema.extend(LoginSettings));
export type PublicSettings = typeof PublicSettings.Type;

export const Status = Schema.Struct({ version: Schema.String });
export type Status = typeof Status.Type;

const CastMember = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  character: OptionalText,
  profilePath: OptionalText,
  order: OptionalNumber,
});
export type CastMember = typeof CastMember.Type;

const CrewMember = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  job: OptionalText,
  department: OptionalText,
});
export type CrewMember = typeof CrewMember.Type;

const Credits = Schema.Struct({
  cast: Schema.optional(Schema.Array(CastMember)),
  crew: Schema.optional(Schema.Array(CrewMember)),
});

const RelatedVideo = Schema.Struct({
  site: OptionalText,
  key: OptionalText,
  name: OptionalText,
  type: OptionalText,
  url: OptionalText,
});

const RegionalWatchProviders = Schema.Struct({
  iso_3166_1: Schema.String,
  link: OptionalText,
  flatrate: Schema.optional(Schema.Array(WatchProvider)),
  buy: Schema.optional(Schema.Array(WatchProvider)),
  rent: Schema.optional(Schema.Array(WatchProvider)),
});
export type RegionalWatchProviders = typeof RegionalWatchProviders.Type;

const ProductionCountry = Schema.Struct({ iso_3166_1: Schema.String, name: Schema.String });
const SpokenLanguage = Schema.Struct({
  iso_639_1: Schema.String,
  englishName: OptionalText,
  english_name: OptionalText,
  name: OptionalText,
});

const DetailsBase = {
  id: Schema.Number,
  overview: OptionalText,
  tagline: OptionalText,
  posterPath: OptionalText,
  backdropPath: OptionalText,
  genres: Schema.optional(Schema.Array(Genre)),
  originalLanguage: OptionalText,
  voteAverage: OptionalNumber,
  voteCount: OptionalNumber,
  popularity: OptionalNumber,
  status: OptionalText,
  homepage: OptionalText,
  credits: Schema.optional(Credits),
  relatedVideos: Schema.optional(Schema.Array(RelatedVideo)),
  productionCompanies: Schema.optional(Schema.Array(Company)),
  productionCountries: Schema.optional(Schema.Array(ProductionCountry)),
  spokenLanguages: Schema.optional(Schema.Array(SpokenLanguage)),
  keywords: Schema.optional(Schema.Array(Keyword)),
  watchProviders: Schema.optional(Schema.Array(RegionalWatchProviders)),
  mediaInfo: Schema.optional(Schema.NullOr(MediaInfo)),
  onUserWatchlist: OptionalBoolean,
};

const MovieRelease = Schema.Struct({
  iso_3166_1: Schema.String,
  release_dates: Schema.Array(
    Schema.Struct({
      certification: OptionalText,
      release_date: OptionalText,
      type: OptionalNumber,
    }),
  ),
});

export const MovieDetails = Schema.Struct({
  ...DetailsBase,
  title: Schema.String,
  releaseDate: OptionalText,
  runtime: OptionalNumber,
  imdbId: OptionalText,
  releases: Schema.optional(Schema.Struct({ results: Schema.Array(MovieRelease) })),
  externalIds: Schema.optional(Schema.Struct({ imdbId: OptionalText })),
});
export type MovieDetails = typeof MovieDetails.Type;

const Season = Schema.Struct({
  id: Schema.Number,
  seasonNumber: Schema.Number,
  name: OptionalText,
  episodeCount: OptionalNumber,
  airDate: OptionalText,
  posterPath: OptionalText,
});
export type Season = typeof Season.Type;

const ContentRating = Schema.Struct({ iso_3166_1: Schema.String, rating: OptionalText });

export const TvDetails = Schema.Struct({
  ...DetailsBase,
  name: Schema.String,
  firstAirDate: OptionalText,
  lastAirDate: OptionalText,
  numberOfSeasons: OptionalNumber,
  numberOfEpisodes: OptionalNumber,
  episodeRunTime: Schema.optional(Schema.Array(Schema.Number)),
  type: OptionalText,
  inProduction: OptionalBoolean,
  originCountry: Schema.optional(Schema.Array(Schema.String)),
  networks: Schema.optional(Schema.Array(Company)),
  createdBy: Schema.optional(
    Schema.Array(Schema.Struct({ id: Schema.Number, name: Schema.String })),
  ),
  seasons: Schema.optional(Schema.Array(Season)),
  contentRatings: Schema.optional(Schema.Struct({ results: Schema.Array(ContentRating) })),
  externalIds: Schema.optional(Schema.Struct({ imdbId: OptionalText, tvdbId: OptionalNumber })),
});
export type TvDetails = typeof TvDetails.Type;

export const RottenTomatoesRating = Schema.Struct({
  url: OptionalText,
  criticsRating: OptionalText,
  criticsScore: OptionalNumber,
  audienceRating: OptionalText,
  audienceScore: OptionalNumber,
});
export type RottenTomatoesRating = typeof RottenTomatoesRating.Type;

export const ImdbRating = Schema.Struct({
  url: OptionalText,
  criticsScore: OptionalNumber,
  criticsScoreCount: OptionalNumber,
});
export type ImdbRating = typeof ImdbRating.Type;

export const CombinedRatings = Schema.Struct({
  rt: Schema.optional(Schema.NullOr(RottenTomatoesRating)),
  imdb: Schema.optional(Schema.NullOr(ImdbRating)),
});
export type CombinedRatings = typeof CombinedRatings.Type;

export const RequestListPage = Schema.Struct({
  pageInfo: Schema.Struct({ pages: Schema.Number, results: Schema.Number, page: Schema.Number }),
  results: Schema.Array(
    Schema.Struct({
      ...MediaRequest.fields,
      media: Schema.Struct({
        tmdbId: Schema.Number,
        mediaType: Schema.Literal("movie", "tv"),
        status: Schema.Number,
      }),
    }),
  ),
});
export type RequestListPage = typeof RequestListPage.Type;

export const CreatedRequest = Schema.Struct({ id: Schema.Number, status: Schema.Number });
export type CreatedRequest = typeof CreatedRequest.Type;

/** Empty-body responses (watchlist mutations). */
export const NoContent = Schema.Unknown;
