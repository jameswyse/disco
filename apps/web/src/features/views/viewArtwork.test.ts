import { expect, it } from "vitest";

import { viewArtwork } from "./viewArtwork";

import type { ViewSource } from "./views";

const selections = [
  {
    label: "Movies",
    source: { kind: "media", mediaType: "movie" },
    path: "/4SyDTF02R5BepqSdQmOaNCHObzF.jpg",
  },
  {
    label: "TV Shows",
    source: { kind: "media", mediaType: "tv" },
    path: "/ncQ8D4j8GSuL9CzncLEXnhHDxHy.jpg",
  },
  {
    label: "Comedy",
    source: { kind: "genre", movieGenreId: 35, tvGenreId: 35 },
    path: "/77ElMccPnTMPouRxSdbJ4nEjf69.jpg",
  },
  {
    label: "Thriller",
    source: { kind: "genre", movieGenreId: 53 },
    path: "/i5H7zusQGsysGQ8i6P361Vnr0n2.jpg",
  },
  {
    label: "Fantasy",
    source: { kind: "genre", movieGenreId: 14 },
    path: "/oiwc338EoBgS4sEI2ixAny4KQKg.jpg",
  },
  {
    label: "Horror",
    source: { kind: "genre", movieGenreId: 27 },
    path: "/qVGpxnjrGlHaSTCqTQI6viBDSfp.jpg",
  },
  {
    label: "Science Fiction",
    source: { kind: "genre", movieGenreId: 878 },
    path: "/8sNiAPPYU14PUepFNeSNGUTiHW.jpg",
  },
  {
    label: "Action",
    source: { kind: "genre", movieGenreId: 28 },
    path: "/izkMjmhauFx9DjoBQqM5sM5WAwE.jpg",
  },
] satisfies readonly Readonly<{ label: string; source: ViewSource; path: string }>[];

it.each(selections)(
  "uses the selected full-colour backdrop for $label",
  ({ label, source, path }) => {
    const artwork = viewArtwork({
      id: "view",
      label,
      source,
      backdropPath: "/previous-backdrop.jpg",
    });

    expect(artwork.background).toContain(`https://image.tmdb.org/t/p/w780${path}`);
    expect(artwork.background).not.toContain("duotone");
    expect(artwork.background).not.toContain("previous-backdrop");
    expect(artwork.logo).toEqual({ kind: "none" });
  },
);
