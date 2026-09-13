import { describe, expect, it } from "vitest";

import { planBrowseSources } from "./browsePlan";

import type { View } from "@/features/views/views";

const moviesView: View = {
  kind: "media",
  id: "movies",
  label: "Movies",
  description: "",
  mediaType: "movie",
  tone: "",
};
const netflixView: View = {
  kind: "provider",
  id: "netflix",
  label: "Netflix",
  watchProviderId: 8,
  tone: "",
};
const context = { today: "2026-09-13", region: "AU" };

describe("planBrowseSources", () => {
  it("uses Seerr's trending and upcoming endpoints for unfiltered media views", () => {
    expect(planBrowseSources(moviesView, "trending", context)).toEqual([
      { kind: "trending", mediaType: "movie" },
    ]);
    expect(planBrowseSources(moviesView, "upcoming", context)).toEqual([
      { kind: "upcoming", mediaType: "movie" },
    ]);
  });

  it("sorts popular lists by popularity", () => {
    expect(planBrowseSources(moviesView, "popular", context)).toEqual([
      { kind: "discover", mediaType: "movie", query: { sortBy: "popularity.desc" } },
    ]);
  });

  it("bounds recent releases to the last 90 days with a vote floor", () => {
    expect(planBrowseSources(moviesView, "recent", context)).toEqual([
      {
        kind: "discover",
        mediaType: "movie",
        query: {
          sortBy: "primary_release_date.desc",
          releasedAfter: "2026-06-15",
          releasedBefore: "2026-09-13",
          voteCountAtLeast: 10,
        },
      },
    ]);
  });

  it("combines movies and series for provider views and carries the provider filter", () => {
    const sources = planBrowseSources(netflixView, "popular", context);

    expect(sources.map((source) => source.mediaType)).toEqual(["movie", "tv"]);
    expect(sources[0]).toEqual({
      kind: "discover",
      mediaType: "movie",
      query: { sortBy: "popularity.desc", watchProviders: [8], watchRegion: "AU" },
    });
  });

  it("approximates trending and upcoming for provider views with discover queries", () => {
    const [trendingMovies] = planBrowseSources(netflixView, "trending", context);
    const [, upcomingTv] = planBrowseSources(netflixView, "upcoming", context);

    expect(trendingMovies).toEqual({
      kind: "discover",
      mediaType: "movie",
      query: {
        sortBy: "popularity.desc",
        releasedAfter: "2025-09-13",
        watchProviders: [8],
        watchRegion: "AU",
      },
    });
    expect(upcomingTv).toEqual({
      kind: "discover",
      mediaType: "tv",
      query: {
        sortBy: "first_air_date.asc",
        releasedAfter: "2026-09-14",
        watchProviders: [8],
        watchRegion: "AU",
      },
    });
  });
});
