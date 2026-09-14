import { describe, expect, it } from "vitest";

import { availabilityFromStatus, titleFromResult } from "./title";

import type { MovieResult, TvResult } from "@/integrations/seerr/schemas";

const genreNames = new Map([
  [18, "Drama"],
  [80, "Crime"],
]);

const movie: MovieResult = {
  id: 1108427,
  mediaType: "movie",
  title: "Moana",
  releaseDate: "2026-07-08",
  posterPath: "/gaet1xQ2nxrG0V1Ep9T20ZMNEIC.jpg",
  backdropPath: null,
  overview: "Teenage Moana answers the Ocean's call.",
  voteAverage: 7.14,
  voteCount: 561,
  popularity: 326.2,
  genreIds: [18, 99999],
  mediaInfo: { tmdbId: 1108427, status: 5 },
};

const series: TvResult = {
  id: 1,
  mediaType: "tv",
  name: "Adolescence",
  firstAirDate: "2025-03-13",
  genreIds: [80, 18],
  voteAverage: 8.2,
  voteCount: 4,
};

describe("availabilityFromStatus", () => {
  it("maps Seerr media statuses", () => {
    expect(availabilityFromStatus(undefined)).toBe("not-in-library");
    expect(availabilityFromStatus(1)).toBe("not-in-library");
    expect(availabilityFromStatus(2)).toBe("pending");
    expect(availabilityFromStatus(3)).toBe("processing");
    expect(availabilityFromStatus(4)).toBe("partially-available");
    expect(availabilityFromStatus(5)).toBe("available");
    expect(availabilityFromStatus(6)).toBe("not-in-library");
  });
});

describe("titleFromResult", () => {
  it("maps a movie, rounding the rating and dropping unknown genres", () => {
    expect(titleFromResult(movie, genreNames)).toEqual({
      id: 1108427,
      mediaType: "movie",
      name: "Moana",
      year: 2026,
      rating: 7.1,
      voteCount: 561,
      popularity: 326.2,
      overview: "Teenage Moana answers the Ocean's call.",
      posterPath: "/gaet1xQ2nxrG0V1Ep9T20ZMNEIC.jpg",
      backdropPath: undefined,
      genres: ["Drama"],
      availability: "available",
    });
  });

  it("maps a series and omits ratings backed by too few votes", () => {
    const title = titleFromResult(series, genreNames);

    expect(title.mediaType).toBe("tv");
    expect(title.name).toBe("Adolescence");
    expect(title.year).toBe(2025);
    expect(title.rating).toBeUndefined();
    expect(title.genres).toEqual(["Crime", "Drama"]);
    expect(title.availability).toBe("not-in-library");
  });

  it("treats empty dates and paths as unknown", () => {
    const title = titleFromResult({ ...movie, releaseDate: "", posterPath: "" }, genreNames);

    expect(title.year).toBeUndefined();
    expect(title.posterPath).toBeUndefined();
  });
});
