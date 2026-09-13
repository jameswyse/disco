import { describe, expect, it } from "vitest";

import { planBrowseSources } from "./browsePlan";
import { noFilters } from "./filters";

import type { View } from "@/features/views/views";

const moviesView: View = {
  id: "movies",
  label: "Movies",
  source: { kind: "media", mediaType: "movie" },
};
const netflixView: View = {
  id: "netflix",
  label: "Netflix",
  source: { kind: "provider", providerId: 8 },
};
const hboView: View = { id: "hbo", label: "HBO", source: { kind: "network", networkId: 49 } };
const dramaView: View = {
  id: "drama",
  label: "Drama",
  source: { kind: "genre", movieGenreId: 18, tvGenreId: 18 },
};
const context = { today: "2026-09-13", region: "AU" };

describe("planBrowseSources", () => {
  it("uses Seerr's trending and upcoming endpoints for unfiltered media views", () => {
    expect(planBrowseSources(moviesView, "trending", noFilters, context)).toEqual([
      { kind: "trending", mediaType: "movie" },
    ]);
    expect(planBrowseSources(moviesView, "upcoming", noFilters, context)).toEqual([
      { kind: "upcoming", mediaType: "movie" },
    ]);
  });

  it("sorts popular lists by popularity", () => {
    expect(planBrowseSources(moviesView, "popular", noFilters, context)).toEqual([
      { kind: "discover", mediaType: "movie", query: { sortBy: "popularity.desc" } },
    ]);
  });

  it("bounds recent releases to the last 180 days with a vote floor", () => {
    expect(planBrowseSources(moviesView, "recent", noFilters, context)).toEqual([
      {
        kind: "discover",
        mediaType: "movie",
        query: {
          sortBy: "primary_release_date.desc",
          releasedAfter: "2026-03-17",
          releasedBefore: "2026-09-13",
          voteCountAtLeast: 5,
        },
      },
    ]);
  });

  it("combines movies and series for provider views and carries the provider filter", () => {
    const sources = planBrowseSources(netflixView, "popular", noFilters, context);

    expect(sources.map((source) => source.mediaType)).toEqual(["movie", "tv"]);
    expect(sources[0]).toEqual({
      kind: "discover",
      mediaType: "movie",
      query: { sortBy: "popularity.desc", watchProviders: [8], watchRegion: "AU" },
    });
  });

  it("approximates trending and upcoming for constrained views with discover queries", () => {
    const [trendingMovies] = planBrowseSources(netflixView, "trending", noFilters, context);
    const [, upcomingTv] = planBrowseSources(netflixView, "upcoming", noFilters, context);

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

  it("limits network views to series and studio-style constraints to their media type", () => {
    expect(planBrowseSources(hboView, "popular", noFilters, context)).toEqual([
      { kind: "discover", mediaType: "tv", query: { sortBy: "popularity.desc", network: 49 } },
    ]);
  });

  it("narrows mixed views with the media type filter", () => {
    const sources = planBrowseSources(
      netflixView,
      "popular",
      { ...noFilters, mediaType: "tv" },
      context,
    );

    expect(sources.map((source) => source.mediaType)).toEqual(["tv"]);
  });

  it("switches trending to a discover query once grid filters apply and merges genres", () => {
    const [source] = planBrowseSources(
      dramaView,
      "trending",
      { ...noFilters, genreId: 80, language: "ko", ratingAtLeast: 7 },
      context,
    );

    expect(source).toEqual({
      kind: "discover",
      mediaType: "movie",
      query: {
        sortBy: "popularity.desc",
        releasedAfter: "2025-09-13",
        genres: [18, 80],
        originalLanguage: "ko",
        voteAverageAtLeast: 7,
        voteCountAtLeast: 50,
      },
    });
  });
});
