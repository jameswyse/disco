import { describe, expect, it } from "vitest";

import { browseHref } from "./browseHref";
import { filterEntries, noFilters, parseBrowseFilters } from "./filters";

describe("parseBrowseFilters", () => {
  it("reads every supported filter", () => {
    expect(
      parseBrowseFilters({ type: "tv", genre: "18", lang: "ko", rating: "7", hide: "1" }),
    ).toEqual({
      mediaType: "tv",
      genreId: 18,
      language: "ko",
      ratingAtLeast: 7,
      hideAvailable: true,
    });
  });

  it("ignores values outside the supported sets", () => {
    expect(
      parseBrowseFilters({
        type: "person",
        genre: "-1",
        lang: "english",
        rating: "9",
        hide: "yes",
      }),
    ).toEqual(noFilters);
  });
});

describe("browseHref", () => {
  it("omits defaults and keeps active filters", () => {
    expect(browseHref({ viewId: "netflix", listId: "trending", filters: noFilters, page: 1 })).toBe(
      "/netflix",
    );
    expect(
      browseHref({
        viewId: "netflix",
        listId: "popular",
        filters: { ...noFilters, genreId: 18, hideAvailable: true },
        page: 3,
      }),
    ).toBe("/netflix?list=popular&genre=18&hide=1&page=3");
  });

  it("round-trips through the parser", () => {
    const filters = { ...noFilters, mediaType: "movie" as const, ratingAtLeast: 8 };

    expect(parseBrowseFilters(Object.fromEntries(filterEntries(filters)))).toEqual(filters);
  });
});
