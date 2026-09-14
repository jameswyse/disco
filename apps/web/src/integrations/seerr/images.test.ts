import { describe, expect, it } from "vitest";

import { tmdbImageUrl } from "./images";

describe("tmdbImageUrl", () => {
  it("preserves absolute episode artwork URLs from Seerr", () => {
    const still =
      "https://artworks.thetvdb.com/banners/v4/episode/8868133/screencap/61fcad53ee9f2.jpg";

    expect(tmdbImageUrl("w500", still)).toBe(still);
  });

  it("adds the selected TMDB size to relative artwork paths", () => {
    expect(tmdbImageUrl("w500", "/outside.jpg")).toBe(
      "https://image.tmdb.org/t/p/w500/outside.jpg",
    );
  });
});
