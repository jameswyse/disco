import { describe, expect, it } from "vitest";

import { browseHref } from "./browseHref";
import { filterEntries, defaultFilters, parseBrowseFilters } from "./filters";

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
      hideRequested: true,
    });
  });

  it("ignores values outside the supported sets", () => {
    expect(
      parseBrowseFilters(
        { type: "person", genre: "-1", lang: "english", rating: "10", hide: "yes" },
        undefined,
      ),
    ).toEqual(defaultFilters);
  });

  it("defaults both hiding filters on and allows each to be disabled", () => {
    expect(parseBrowseFilters({}, undefined)).toMatchObject({
      hideAvailable: true,
      hideRequested: true,
    });
    expect(parseBrowseFilters({ hide: "0" }, undefined)).toMatchObject({
      hideAvailable: false,
      hideRequested: true,
    });
    expect(parseBrowseFilters({ hideRequested: "0" }, undefined)).toMatchObject({
      hideAvailable: true,
      hideRequested: false,
    });
    expect(parseBrowseFilters({ hide: "1", hideRequested: "1" }, undefined)).toMatchObject({
      hideAvailable: true,
      hideRequested: true,
    });
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
        filters: defaultFilters,
        defaultLanguage: undefined,
        page: 1,
      }),
    ).toBe("/netflix");
    expect(
      browseHref({
        viewId: "netflix",
        listId: "popular",
        filters: { ...defaultFilters, genreId: 18, hideAvailable: false, hideRequested: false },
        defaultLanguage: undefined,
        page: 3,
      }),
    ).toBe("/netflix?list=popular&genre=18&hide=0&hideRequested=0&page=3");
  });

  it("only names the language when it differs from the saved default", () => {
    const location = {
      viewId: "movies",
      listId: "trending" as const,
      defaultLanguage: "en",
      page: 1,
    };

    expect(browseHref({ ...location, filters: { ...defaultFilters, language: "en" } })).toBe(
      "/movies",
    );
    expect(browseHref({ ...location, filters: { ...defaultFilters, language: "ko" } })).toBe(
      "/movies?lang=ko",
    );
    expect(browseHref({ ...location, filters: defaultFilters })).toBe("/movies?lang=any");
  });

  it("round-trips through the parser", () => {
    const filters = { ...defaultFilters, mediaType: "movie" as const, ratingAtLeast: 8 };

    expect(
      parseBrowseFilters(Object.fromEntries(filterEntries(filters, undefined)), undefined),
    ).toEqual(filters);
  });
});
