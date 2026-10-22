import { tmdbDuotoneBackdropUrl, tmdbImageUrl, tmdbWordmarkUrl } from "@/integrations/seerr/images";

import { featuredNetworkIds, featuredStudioIds } from "./featuredCompanies";

import type { MediaType } from "@/integrations/seerr/client";

import type { View, ViewSource } from "./views";

export type ViewArtwork = Readonly<{
  background: string;
  logo: Readonly<{ kind: "icon" | "wordmark"; src: string }> | Readonly<{ kind: "none" }>;
}>;

const providerWordmarks = new Map<number, string>([
  [8, "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png"],
  [9, "/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png"],
  [15, "/pqUTCleNUiTLAVlelGxUgWn1ELh.png"],
  [119, "/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png"],
  [337, "/gJ8VX6JSu3ciXHuC2dDGAo2lvwM.png"],
  [350, "/4KAy34EHvRM25Ih8wb82AuGU7zJ.png"],
  [531, "/fi83B1oztoS47xxcemFdPMhIzK.png"],
]);

const defaultWordmarkTone = ["ffffff", "bababa"] as const;

const abcLogo = "/2uy2ZWcplrSObIyt4x0Y9rkG6qO.png";
const marvelStudiosLogo = "/hUzeosd33nzE5MCNsZxCGEKTXaQ.png";
const warnerBrosPicturesLogo = "/zhD3hhtKB5qyv7ZeL4uLpNxgMVU.png";

const wordmarkTones = new Map<string, readonly [string, string]>([
  [abcLogo, ["ffffff", "000000"]],
  [marvelStudiosLogo, ["ffffff", "000000"]],
  [warnerBrosPicturesLogo, ["000000", "ffffff"]],
]);

function wordmarkUrl(path: string): string {
  const [dark, light] = wordmarkTones.get(path) ?? defaultWordmarkTone;

  return tmdbWordmarkUrl(path, dark, light);
}

const companyBackground = "linear-gradient(0deg, #111827, #1f2937 45%)";

const tones = {
  provider: companyBackground,
  network: companyBackground,
  studio: companyBackground,
  language: "linear-gradient(135deg, #7c2d12, #1c1917)",
  keyword: "linear-gradient(135deg, #312e81, #0f172a)",
} satisfies Record<Exclude<ViewSource["kind"], "media" | "genre">, string>;

const mediaBackdrops = {
  movie: "/4SyDTF02R5BepqSdQmOaNCHObzF.jpg",
  tv: "/ncQ8D4j8GSuL9CzncLEXnhHDxHy.jpg",
} as const;

const genreBackdrops = new Map<number, string>([
  [35, "/77ElMccPnTMPouRxSdbJ4nEjf69.jpg"],
  [53, "/i5H7zusQGsysGQ8i6P361Vnr0n2.jpg"],
  [14, "/oiwc338EoBgS4sEI2ixAny4KQKg.jpg"],
  [27, "/qVGpxnjrGlHaSTCqTQI6viBDSfp.jpg"],
  [878, "/8sNiAPPYU14PUepFNeSNGUTiHW.jpg"],
  [28, "/izkMjmhauFx9DjoBQqM5sM5WAwE.jpg"],
]);

function selectedArtwork(path: string): ViewArtwork {
  return {
    background: `linear-gradient(rgb(0 0 0 / 14%), rgb(0 0 0 / 30%)), url("${tmdbImageUrl("w780", path)}") center / cover`,
    logo: { kind: "none" },
  };
}

const genreTones = new Map<number, readonly [string, string]>([
  [28, ["991B1B", "FCA5A5"]],
  [12, ["480c8b", "a96bef"]],
  [16, ["032541", "01b4e4"]],
  [35, ["92400E", "FCD34D"]],
  [80, ["1F2937", "2864d2"]],
  [99, ["065F46", "6EE7B7"]],
  [18, ["9D174D", "F9A8D4"]],
  [10751, ["777e0d", "e4ed55"]],
  [14, ["1F2937", "60A5FA"]],
  [36, ["92400E", "FCD34D"]],
  [10402, ["032541", "01b4e4"]],
  [9648, ["5B21B6", "C4B5FD"]],
  [10749, ["9D174D", "F9A8D4"]],
  [878, ["1F2937", "60A5FA"]],
  [10770, ["991B1B", "FCA5A5"]],
  [10752, ["1F2937", "F87171"]],
  [37, ["92400E", "FCD34D"]],
  [10759, ["480c8b", "a96bef"]],
  [10762, ["032541", "01b4e4"]],
  [10764, ["552c01", "d47c1d"]],
  [10765, ["1F2937", "60A5FA"]],
  [10766, ["9D174D", "F9A8D4"]],
  [10767, ["065F46", "6EE7B7"]],
  [10768, ["1F2937", "F87171"]],
]);

function genreTone(source: Extract<ViewSource, { kind: "genre" }>): readonly [string, string] {
  return genreTones.get(source.movieGenreId ?? source.tvGenreId ?? 0) ?? ["1F2937", "D1D5DB"];
}

function toneGradient([dark, light]: readonly [string, string]): string {
  return `linear-gradient(135deg, #${dark}, #${light})`;
}

export function viewArtwork(view: View): ViewArtwork {
  const { source } = view;

  if (source.kind === "media") {
    return selectedArtwork(mediaBackdrops[source.mediaType]);
  }

  if (source.kind === "genre") {
    const selected = genreBackdrops.get(source.movieGenreId ?? source.tvGenreId ?? 0);

    if (selected !== undefined) {
      return selectedArtwork(selected);
    }

    const tone = genreTone(source);
    const [dark, light] = tone;

    return {
      background: view.backdropPath
        ? `linear-gradient(rgb(15 23 42 / 20%), rgb(15 23 42 / 20%)), url("${tmdbDuotoneBackdropUrl(view.backdropPath, dark, light)}") center / cover`
        : toneGradient(tone),
      logo: { kind: "none" },
    };
  }

  if (view.backdropPath) {
    return {
      background: `linear-gradient(90deg, rgb(0 0 0 / 65%), rgb(0 0 0 / 25%)), url("${tmdbImageUrl("w780", view.backdropPath)}") center / cover`,
      logo: { kind: "none" },
    };
  }

  const tone = tones[source.kind];

  const providerWordmark =
    source.kind === "provider" ? providerWordmarks.get(source.providerId) : undefined;

  if (providerWordmark) {
    return { background: tone, logo: { kind: "wordmark", src: wordmarkUrl(providerWordmark) } };
  }

  if (!view.logoPath) {
    return { background: tone, logo: { kind: "none" } };
  }

  return {
    background: tone,
    logo:
      source.kind === "provider"
        ? { kind: "icon", src: tmdbImageUrl("w154", view.logoPath) }
        : { kind: "wordmark", src: wordmarkUrl(view.logoPath) },
  };
}

export type ViewIcon =
  | Readonly<{ kind: "image"; src: string }>
  | Readonly<{ kind: "glyph"; mediaType: MediaType }>
  | Readonly<{ kind: "swatch"; background: string }>;

const companyIcons = {
  network: { ids: featuredNetworkIds, directory: "networks" },
  studio: { ids: featuredStudioIds, directory: "studios" },
} as const;

function companyIcon(kind: keyof typeof companyIcons, id: number): ViewIcon {
  const { ids, directory } = companyIcons[kind];

  return ids.includes(id)
    ? { kind: "image", src: `/logos/${directory}/${id}.webp` }
    : { kind: "swatch", background: tones[kind] };
}

export function viewIcon(view: View): ViewIcon {
  const { source } = view;

  switch (source.kind) {
    case "media":
      return { kind: "glyph", mediaType: source.mediaType };
    case "provider":
      return view.logoPath
        ? { kind: "image", src: tmdbImageUrl("w92", view.logoPath) }
        : { kind: "swatch", background: tones.provider };
    case "network":
      return companyIcon("network", source.networkId);
    case "studio":
      return companyIcon("studio", source.companyId);
    case "genre":
      return { kind: "swatch", background: toneGradient(genreTone(source)) };
    case "language":
    case "keyword":
      return { kind: "swatch", background: tones[source.kind] };

    default: {
      const unsupportedSource: never = source;

      return unsupportedSource;
    }
  }
}
