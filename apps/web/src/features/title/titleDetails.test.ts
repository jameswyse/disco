import { describe, expect, it } from "vitest";

import { titleDetailsFromMovie } from "./titleDetails";
import { titlePreviewFromDetails } from "./titlePreview";

describe("title trailers", () => {
  it.each([
    { key: "M7lc1UVf-VE" },
    { url: "https://www.youtube.com/watch?v=M7lc1UVf-VE&feature=shared" },
    { url: "https://youtu.be/M7lc1UVf-VE" },
    { url: "https://www.youtube.com/embed/M7lc1UVf-VE" },
  ])("provides an autoplaying, fullscreen-capable embed for %j", (video) => {
    const details = titleDetailsFromMovie(
      {
        id: 1,
        title: "Example",
        relatedVideos: [{ ...video, site: "YouTube", type: "Trailer" }],
      },
      undefined,
      "AU",
      "2026-09-15",
    );

    expect(details.trailerEmbedUrl).toBe(
      "https://www.youtube.com/embed/M7lc1UVf-VE?autoplay=1&playsinline=1&controls=0&fs=1&rel=0",
    );
    expect(titlePreviewFromDetails(details, false).trailerEmbedUrl).toBe(
      "https://www.youtube.com/embed/M7lc1UVf-VE?autoplay=1&playsinline=1&controls=0&fs=1&rel=0",
    );
  });

  it.each([
    { url: "not a URL" },
    { url: "https://untrusted.example/watch?v=M7lc1UVf-VE" },
    { key: "../not-a-video" },
  ])("omits unplayable or unsafe trailer sources: %j", (video) => {
    const details = titleDetailsFromMovie(
      { id: 1, title: "Example", relatedVideos: [{ ...video, site: "YouTube" }] },
      undefined,
      "AU",
      "2026-09-15",
    );

    expect(details.trailerEmbedUrl).toBeUndefined();
  });

  it("prefers a trailer to other YouTube videos", () => {
    const details = titleDetailsFromMovie(
      {
        id: 1,
        title: "Example",
        relatedVideos: [
          { site: "YouTube", type: "Clip", key: "clip" },
          { site: "YouTube", type: "Trailer", key: "trailer" },
        ],
      },
      undefined,
      "AU",
      "2026-09-15",
    );

    expect(details.trailerEmbedUrl).toBe(
      "https://www.youtube.com/embed/trailer?autoplay=1&playsinline=1&controls=0&fs=1&rel=0",
    );
  });
});
