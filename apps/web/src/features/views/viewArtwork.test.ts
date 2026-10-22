import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { assert, expect, it } from "vitest";

import { featuredNetworkIds, featuredStudioIds } from "./featuredCompanies";
import { viewArtwork, viewIcon } from "./viewArtwork";

import type { View, ViewSource } from "./views";

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
    const artwork = viewArtwork(
      { id: "view", label, source, backdropPath: "/previous-backdrop.jpg" },
      "monochrome",
    );

    expect(artwork.background).toContain(`https://image.tmdb.org/t/p/w780${path}`);
    expect(artwork.background).not.toContain("duotone");
    expect(artwork.background).not.toContain("previous-backdrop");
    expect(artwork.logo).toStrictEqual({ kind: "none" });
  },
);

const wordmarkViews: readonly Readonly<{ name: string; view: View; path: string }>[] = [
  {
    name: "a network",
    view: {
      id: "hbo",
      label: "HBO",
      source: { kind: "network", networkId: 49 },
      logoPath: "/hbo.png",
    },
    path: "/hbo.png",
  },
  {
    name: "a studio",
    view: {
      id: "a24",
      label: "A24",
      source: { kind: "studio", companyId: 41077 },
      logoPath: "/a24.png",
    },
    path: "/a24.png",
  },
];

it.each(wordmarkViews)("shows the logo for $name in monochrome or colour", ({ view, path }) => {
  const monochrome = viewArtwork(view, "monochrome");
  const color = viewArtwork(view, "color");

  expect(monochrome.logo).toStrictEqual({
    kind: "wordmark",
    src: `https://image.tmdb.org/t/p/w300_filter(duotone,ffffff,bababa)${path}`,
  });
  expect(color.logo).toStrictEqual({
    kind: "wordmark",
    src: `https://image.tmdb.org/t/p/w300${path}`,
  });
  expect(color.background).not.toBe(monochrome.background);
});

const publicDirectory = fileURLToPath(new URL("../../../public", import.meta.url));

const featured: readonly Readonly<{ name: string; source: ViewSource }>[] = [
  ...featuredNetworkIds.map((networkId) => ({
    name: `network ${networkId}`,
    source: { kind: "network", networkId } as const,
  })),
  ...featuredStudioIds.map((companyId) => ({
    name: `studio ${companyId}`,
    source: { kind: "studio", companyId } as const,
  })),
];

it.each(featured)("ships a sidebar icon file for featured $name", ({ source }) => {
  const icon = viewIcon({ id: "view", label: "View", source });

  assert(icon.kind === "image", `expected an image icon, got ${icon.kind}`);
  expect(existsSync(`${publicDirectory}${icon.src}`), `missing public${icon.src}`).toBe(true);
});
