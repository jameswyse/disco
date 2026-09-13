import type { View } from "@/features/views/views";
import type { DiscoverQuery, MediaType } from "@/integrations/seerr/client";

import type { DiscoverListId } from "./discoverLists";

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

const recentWindowDays = 90;
const trendingWindowDays = 365;
/** Keeps very obscure releases out of date-sorted lists. */
const minimumVotes = 10;

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

function providerQuery(
  view: Extract<View, { kind: "provider" }>,
  context: BrowseContext,
): Pick<DiscoverQuery, "watchProviders" | "watchRegion"> {
  return { watchProviders: [view.watchProviderId], watchRegion: context.region };
}

function planForMediaType(
  view: View,
  list: DiscoverListId,
  mediaType: MediaType,
  context: BrowseContext,
): BrowseSource {
  const provider = view.kind === "provider" ? providerQuery(view, context) : {};

  switch (list) {
    case "popular":
      return { kind: "discover", mediaType, query: { ...provider, sortBy: "popularity.desc" } };
    case "trending":
      // TMDB trending cannot be filtered by provider, so provider views approximate it with
      // popularity among titles from the last year.
      return view.kind === "provider"
        ? {
            kind: "discover",
            mediaType,
            query: {
              ...provider,
              sortBy: "popularity.desc",
              releasedAfter: shiftDate(context.today, -trendingWindowDays),
            },
          }
        : { kind: "trending", mediaType };
    case "upcoming":
      return view.kind === "provider"
        ? {
            kind: "discover",
            mediaType,
            query: {
              ...provider,
              sortBy: dateSort(mediaType, "asc"),
              releasedAfter: shiftDate(context.today, 1),
            },
          }
        : { kind: "upcoming", mediaType };
    case "recent":
      return {
        kind: "discover",
        mediaType,
        query: {
          ...provider,
          sortBy: dateSort(mediaType, "desc"),
          releasedAfter: shiftDate(context.today, -recentWindowDays),
          releasedBefore: context.today,
          voteCountAtLeast: minimumVotes,
        },
      };

    default: {
      const unsupportedList: never = list;

      return unsupportedList;
    }
  }
}

/** Decide which Seerr endpoints feed a view's list. Provider views combine movies and series. */
export function planBrowseSources(
  view: View,
  list: DiscoverListId,
  context: BrowseContext,
): readonly BrowseSource[] {
  const mediaTypes: readonly MediaType[] =
    view.kind === "media" ? [view.mediaType] : ["movie", "tv"];

  return mediaTypes.map((mediaType) => planForMediaType(view, list, mediaType, context));
}
