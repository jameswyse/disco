import { viewMediaTypes } from "@/features/views/views";

import { hasDiscoverFilters } from "./filters";
import { providerOriginals } from "./providerOriginals";

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

  if (filters.year !== undefined) {
    constraints.releasedAfter = `${filters.year}-01-01`;
    constraints.releasedBefore = `${filters.year}-12-31`;
  }

  if (filters.votesAtLeast !== undefined) {
    constraints.voteCountAtLeast = Math.max(
      constraints.voteCountAtLeast ?? 0,
      filters.votesAtLeast,
    );
  }

  return constraints;
}

function mergeConstraints(view: DiscoverConstraints, filter: DiscoverConstraints) {
  const merged: MutableConstraints = { ...filter, ...view };

  return merged;
}

function planForMediaType(
  view: View,
  list: DiscoverListId,
  filters: BrowseFilters,
  mediaType: MediaType,
  context: BrowseContext,
): BrowseSource | undefined {
  const source =
    view.source.kind === "provider" && list === "upcoming"
      ? providerOriginals(view.source.providerId, mediaType)
      : sourceConstraints(view.source, mediaType, context);

  if (source === undefined) {
    return undefined;
  }

  const constraints = mergeConstraints(source, filterConstraints(filters));
  // Seerr's trending and upcoming endpoints take no filters, so anything constrained falls back
  // to TMDB discover approximations.
  const constrained = view.source.kind !== "media" || hasDiscoverFilters(filters);

  const discover = (query: Omit<DiscoverQuery, "page">): BrowseSource | undefined => {
    const sorts = {
      popular: "popularity.desc",
      rating: "vote_average.desc",
      newest: dateSort(mediaType, "desc"),
      oldest: dateSort(mediaType, "asc"),
    } satisfies Record<NonNullable<BrowseFilters["sort"]>, DiscoverQuery["sortBy"]>;
    const sorted = { ...query, sortBy: filters.sort ? sorts[filters.sort] : query.sortBy };

    if (filters.year !== undefined) {
      sorted.releasedAfter =
        query.releasedAfter && query.releasedAfter > `${filters.year}-01-01`
          ? query.releasedAfter
          : `${filters.year}-01-01`;
      sorted.releasedBefore =
        query.releasedBefore && query.releasedBefore < `${filters.year}-12-31`
          ? query.releasedBefore
          : `${filters.year}-12-31`;
    }

    if (
      sorted.releasedAfter &&
      sorted.releasedBefore &&
      sorted.releasedAfter > sorted.releasedBefore
    ) {
      return undefined;
    }

    return { kind: "discover", mediaType, query: sorted };
  };

  switch (list) {
    case "popular":
      return discover({ ...constraints, sortBy: "popularity.desc" });
    case "trending":
      return constrained
        ? discover({
            ...constraints,
            sortBy: "popularity.desc",
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
    .flatMap((mediaType) => {
      const source = planForMediaType(view, list, filters, mediaType, context);

      return source === undefined ? [] : [source];
    });
}
