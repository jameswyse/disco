import { tmdbDuotoneBackdropUrl, tmdbImageUrl, tmdbWordmarkUrl } from "@/integrations/seerr/images";

import type { View, ViewSource } from "./views";

export type ViewArtwork = Readonly<{
  /** CSS `background` for the card. */
  background: string;
  /** Square icons sit beside the label; wordmarks replace it. */
  logo: Readonly<{ kind: "icon" | "wordmark"; src: string }> | Readonly<{ kind: "none" }>;
}>;

// Network wordmarks used by Seerr, keyed by the corresponding TMDB watch provider ids.
// https://github.com/seerr-team/seerr/blob/develop/src/components/Discover/NetworkSlider/index.tsx
const providerWordmarks = new Map<number, string>([
  [8, "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png"], // Netflix
  [9, "/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png"], // Prime Video
  [15, "/pqUTCleNUiTLAVlelGxUgWn1ELh.png"], // Hulu
  [119, "/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png"], // Prime Video outside the US
  [337, "/gJ8VX6JSu3ciXHuC2dDGAo2lvwM.png"], // Disney+
  [350, "/4KAy34EHvRM25Ih8wb82AuGU7zJ.png"], // Apple TV+
  [531, "/fi83B1oztoS47xxcemFdPMhIzK.png"], // Paramount+
]);

const companyBackground = "linear-gradient(0deg, #111827, #1f2937 45%)";

const tones = {
  provider: companyBackground,
  network: companyBackground,
  studio: companyBackground,
  language: "linear-gradient(135deg, #7c2d12, #1c1917)",
  keyword: "linear-gradient(135deg, #312e81, #0f172a)",
} satisfies Record<Exclude<ViewSource["kind"], "media" | "genre">, string>;

/** Fixed artwork selected in the sidebar image review (TMDB title ids in comments). */
const mediaBackdrops = {
  movie: "/4SyDTF02R5BepqSdQmOaNCHObzF.jpg", // Jurassic Park (movie/329)
  tv: "/ncQ8D4j8GSuL9CzncLEXnhHDxHy.jpg", // The Simpsons (tv/456)
} as const;

const genreBackdrops = new Map<number, string>([
  [35, "/77ElMccPnTMPouRxSdbJ4nEjf69.jpg"], // The Big Lebowski (movie/115)
  [53, "/i5H7zusQGsysGQ8i6P361Vnr0n2.jpg"], // Se7en (movie/807)
  [14, "/oiwc338EoBgS4sEI2ixAny4KQKg.jpg"], // The Fellowship of the Ring (movie/120)
  [27, "/qVGpxnjrGlHaSTCqTQI6viBDSfp.jpg"], // It (movie/346364)
  [878, "/8sNiAPPYU14PUepFNeSNGUTiHW.jpg"], // Interstellar (movie/157336)
  [28, "/izkMjmhauFx9DjoBQqM5sM5WAwE.jpg"], // Terminator 2 (movie/280)
]);

function selectedArtwork(path: string): ViewArtwork {
  return {
    background: `linear-gradient(rgb(0 0 0 / 14%), rgb(0 0 0 / 30%)), url("${tmdbImageUrl("w780", path)}") center / cover`,
    logo: { kind: "none" },
  };
}

// Seerr's genre palette, keyed by TMDB genre id.
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

    const [dark, light] = genreTones.get(source.movieGenreId ?? source.tvGenreId ?? 0) ?? [
      "1F2937",
      "D1D5DB",
    ];

    return {
      background: view.backdropPath
        ? `linear-gradient(rgb(15 23 42 / 20%), rgb(15 23 42 / 20%)), url("${tmdbDuotoneBackdropUrl(view.backdropPath, dark, light)}") center / cover`
        : `linear-gradient(135deg, #${dark}, #${light})`,
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
    return { background: tone, logo: { kind: "wordmark", src: tmdbWordmarkUrl(providerWordmark) } };
  }

  if (!view.logoPath) {
    return { background: tone, logo: { kind: "none" } };
  }

  return {
    background: tone,
    logo:
      source.kind === "provider"
        ? { kind: "icon", src: tmdbImageUrl("w154", view.logoPath) }
        : { kind: "wordmark", src: tmdbWordmarkUrl(view.logoPath) },
  };
}
