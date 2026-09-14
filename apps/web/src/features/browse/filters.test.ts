import { describe, expect, it } from "vitest";

import { browseHref } from "./browseHref";
import { filterEntries, noFilters, parseBrowseFilters } from "./filters";

describe("parseBrowseFilters", () => {
  it("reads every supported filter", () => {
    expect(
      parseBrowseFilters(
        { type: "tv", genre: "18", lang: "ko", rating: "7", hide: "1" },
        undefined,
      ),
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
      parseBrowseFilters(
        { type: "person", genre: "-1", lang: "english", rating: "10", hide: "yes" },
        undefined,
      ),
    ).toEqual(noFilters);
  });

  it("applies the saved default language unless the URL overrides or clears it", () => {
    expect(parseBrowseFilters({}, "en").language).toBe("en");
    expect(parseBrowseFilters({ lang: "ko" }, "en").language).toBe("ko");
    expect(parseBrowseFilters({ lang: "any" }, "en").language).toBeUndefined();
  });
});

describe("browseHref", () => {
  it("omits defaults and keeps active filters", () => {
    expect(
      browseHref({
        viewId: "netflix",
        listId: "trending",
        filters: noFilters,
        defaultLanguage: undefined,
        page: 1,
      }),
    ).toBe("/netflix");
    expect(
      browseHref({
        viewId: "netflix",
        listId: "popular",
        filters: { ...noFilters, genreId: 18, hideAvailable: true },
        defaultLanguage: undefined,
        page: 3,
      }),
    ).toBe("/netflix?list=popular&genre=18&hide=1&page=3");
  });

  it("only names the language when it differs from the saved default", () => {
    const location = {
      viewId: "movies",
      listId: "trending" as const,
      defaultLanguage: "en",
      page: 1,
    };

    expect(browseHref({ ...location, filters: { ...noFilters, language: "en" } })).toBe("/movies");
    expect(browseHref({ ...location, filters: { ...noFilters, language: "ko" } })).toBe(
      "/movies?lang=ko",
    );
    expect(browseHref({ ...location, filters: noFilters })).toBe("/movies?lang=any");
  });

  it("round-trips through the parser", () => {
    const filters = { ...noFilters, mediaType: "movie" as const, ratingAtLeast: 8 };

    expect(
      parseBrowseFilters(Object.fromEntries(filterEntries(filters, undefined)), undefined),
    ).toEqual(filters);
  });
});
