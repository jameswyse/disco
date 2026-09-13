import { viewMediaTypes } from "@/features/views/views";

import { hasDiscoverFilters } from "./filters";

import type { View, ViewSource } from "@/features/views/views";
import type { DiscoverQuery, MediaType } from "@/integrations/seerr/client";

import type { DiscoverListId } from "./discoverLists";
import type { BrowseFilters } from "./filters";

/** One Seerr endpoint to page through for a browse screen. */
export type BrowseSource =
  | Readonly<{ kind: "trending"; mediaType: MediaType }>
  | Readonly<{ kind: "upcoming"; mediaType: MediaType }>
  | Readonly<{ kind: "discover"; mediaType: MediaType; query: Omit<DiscoverQuery, "page"> }>;

export type BrowseContext = Readonly<{
  /** Today's date as YYYY-MM-DD in the viewer's region. */
  today: string;
  /** Streaming region used for watch-provider filters, for example `AU`. */
  region: string;
}>;

type DiscoverConstraints = Omit<DiscoverQuery, "page" | "sortBy">;

/** Recently released reaches back half a year so narrow views (one network, one studio) still fill. */
const recentWindowDays = 180;
const trendingWindowDays = 365;
/** Keeps very obscure releases out of date-sorted lists. */
const minimumVotes = 5;
/** A rating floor is only meaningful once enough people have voted. */
const minimumVotesForRatingFilter = 50;

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function dateSort(mediaType: MediaType, direction: "asc" | "desc"): DiscoverQuery["sortBy"] {
  return mediaType === "movie"
    ? `primary_release_date.${direction}`
    : `first_air_date.${direction}`;
}

/** Discover parameters implied by the view itself. Empty for unfiltered media views. */
function sourceConstraints(
  source: ViewSource,
  mediaType: MediaType,
  context: BrowseContext,
): DiscoverConstraints {
  switch (source.kind) {
    case "media":
      return {};
    case "provider":
      return { watchProviders: [source.providerId], watchRegion: context.region };
    case "network":
      return { network: source.networkId };
    case "studio":
      return { studio: source.companyId };

    case "genre": {
      const genreId = mediaType === "movie" ? source.movieGenreId : source.tvGenreId;

      return genreId === undefined ? {} : { genres: [genreId] };
    }

    case "language":
      return { originalLanguage: source.language };
    case "keyword":
      return { keywords: [source.keywordId] };

    default: {
      const unsupportedSource: never = source;

      return unsupportedSource;
    }
  }
}

type MutableConstraints = {
  -readonly [Key in keyof DiscoverConstraints]: DiscoverConstraints[Key];
};

function filterConstraints(filters: BrowseFilters): DiscoverConstraints {
  const constraints: MutableConstraints = {};

  if (filters.genreId !== undefined) {
    constraints.genres = [filters.genreId];
  }

  if (filters.language !== undefined) {
    constraints.originalLanguage = filters.language;
  }

  if (filters.ratingAtLeast !== undefined) {
    constraints.voteAverageAtLeast = filters.ratingAtLeast;
    constraints.voteCountAtLeast = minimumVotesForRatingFilter;
  }

  return constraints;
}

function mergeConstraints(view: DiscoverConstraints, filter: DiscoverConstraints) {
  const merged: MutableConstraints = { ...view, ...filter };

  // A view genre and a filter genre both apply (TMDB treats comma-separated genres as "and").
  if (view.genres && filter.genres) {
    merged.genres = [...view.genres, ...filter.genres];
  }

  return merged;
}

function planForMediaType(
  view: View,
  list: DiscoverListId,
  filters: BrowseFilters,
  mediaType: MediaType,
  context: BrowseContext,
): BrowseSource {
  const constraints = mergeConstraints(
    sourceConstraints(view.source, mediaType, context),
    filterConstraints(filters),
  );
  // Seerr's trending and upcoming endpoints take no filters, so anything constrained falls back
  // to TMDB discover approximations.
  const constrained = view.source.kind !== "media" || hasDiscoverFilters(filters);
  const discover = (query: Omit<DiscoverQuery, "page">): BrowseSource => ({
    kind: "discover",
    mediaType,
    query,
  });

  switch (list) {
    case "popular":
      return discover({ ...constraints, sortBy: "popularity.desc" });
    case "trending":
      return constrained
        ? discover({
            ...constraints,
            sortBy: "popularity.desc",
            releasedAfter: shiftDate(context.today, -trendingWindowDays),
          })
        : { kind: "trending", mediaType };
    case "upcoming":
      return constrained
        ? discover({
            ...constraints,
            sortBy: dateSort(mediaType, "asc"),
            releasedAfter: shiftDate(context.today, 1),
          })
        : { kind: "upcoming", mediaType };
    case "recent":
      return discover({
        ...constraints,
        sortBy: dateSort(mediaType, "desc"),
        releasedAfter: shiftDate(context.today, -recentWindowDays),
        releasedBefore: context.today,
        voteCountAtLeast: Math.max(minimumVotes, constraints.voteCountAtLeast ?? 0),
      });

    default: {
      const unsupportedList: never = list;

      return unsupportedList;
    }
  }
}

/** Decide which Seerr endpoints feed a view's list. Mixed views combine movies and series. */
export function planBrowseSources(
  view: View,
  list: DiscoverListId,
  filters: BrowseFilters,
  context: BrowseContext,
): readonly BrowseSource[] {
  return viewMediaTypes(view)
    .filter((mediaType) => filters.mediaType === "all" || mediaType === filters.mediaType)
    .map((mediaType) => planForMediaType(view, list, filters, mediaType, context));
}
