import { Either, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { defaultViews, sameSource, uniqueViewId, viewMediaTypes, ViewSource } from "./views";

describe("genre source decoding", () => {
  it("rejects a genre filter without either genre ID", () => {
    expect(Either.isLeft(Schema.decodeUnknownEither(ViewSource)({ kind: "genre" }))).toBe(true);
  });

  it.each([
    { input: { kind: "genre", movieGenreId: 28 }, mediaTypes: ["movie"] },
    { input: { kind: "genre", tvGenreId: 18 }, mediaTypes: ["tv"] },
    { input: { kind: "genre", movieGenreId: 18, tvGenreId: 18 }, mediaTypes: ["movie", "tv"] },
  ])("preserves the media types in $input", ({ input, mediaTypes }) => {
    const source = Schema.decodeUnknownSync(ViewSource)(input);
    expect(viewMediaTypes({ id: "genre", label: "Genre", source })).toEqual(mediaTypes);
  });
});

describe("viewMediaTypes", () => {
  it("limits networks to series and studios to films", () => {
    expect(
      viewMediaTypes({ id: "hbo", label: "HBO", source: { kind: "network", networkId: 49 } }),
    ).toEqual(["tv"]);
    expect(
      viewMediaTypes({ id: "a24", label: "A24", source: { kind: "studio", companyId: 41077 } }),
    ).toEqual(["movie"]);
  });

  it("uses only the media types a genre exists for", () => {
    expect(
      viewMediaTypes({ id: "g", label: "Action", source: { kind: "genre", movieGenreId: 28 } }),
    ).toEqual(["movie"]);
    expect(
      viewMediaTypes({
        id: "g",
        label: "Drama",
        source: { kind: "genre", movieGenreId: 18, tvGenreId: 18 },
      }),
    ).toEqual(["movie", "tv"]);
  });
});

describe("uniqueViewId", () => {
  it("slugifies labels and avoids collisions with existing ids", () => {
    expect(uniqueViewId("Disney Plus", [])).toBe("disney-plus");
    expect(uniqueViewId("TV Shows", defaultViews)).toBe("tv-shows");
    expect(uniqueViewId("Movies", defaultViews)).toBe("movies-2");
    expect(uniqueViewId("***", [])).toBe("view");
  });
});

describe("sameSource", () => {
  it("compares what a view filters on rather than its label", () => {
    expect(
      sameSource({ kind: "provider", providerId: 8 }, { kind: "provider", providerId: 8 }),
    ).toBe(true);
    expect(sameSource({ kind: "provider", providerId: 8 }, { kind: "network", networkId: 8 })).toBe(
      false,
    );
  });
});
