import { tmdbImageUrl } from "@/integrations/seerr/images";

import type { View, ViewSource } from "./views";

export type ViewArtwork = Readonly<{
  /** CSS `background` for the card. */
  background: string;
  /** How the stored logo should be shown: square icons sit beside the label, wordmarks replace it. */
  logo: "icon" | "wordmark" | "none";
}>;

const tones = {
  movie: "linear-gradient(135deg, #0b1a3f, #3b82f6)",
  tv: "linear-gradient(135deg, #2e1065, #a855f7)",
  media: "linear-gradient(135deg, #0b1a3f, #3b82f6)",
  provider: "linear-gradient(180deg, #1c2540, #0d1326)",
  network: "linear-gradient(180deg, #1f1f2b, #0a0a12)",
  studio: "linear-gradient(180deg, #1e1e1e, #0c0c0c)",
  genre: "linear-gradient(135deg, #134e4a, #0f172a)",
  language: "linear-gradient(135deg, #7c2d12, #1c1917)",
  keyword: "linear-gradient(135deg, #312e81, #0f172a)",
} satisfies Record<ViewSource["kind"] | "movie" | "tv", string>;

export function viewArtwork(view: View): ViewArtwork {
  const { source } = view;

  if (view.backdropPath) {
    return {
      background: `linear-gradient(90deg, rgb(0 0 0 / 65%), rgb(0 0 0 / 25%)), url(${tmdbImageUrl("w780", view.backdropPath)}) center / cover`,
      logo: "none",
    };
  }

  const tone = source.kind === "media" ? tones[source.mediaType] : tones[source.kind];

  if (!view.logoPath) {
    return { background: tone, logo: "none" };
  }

  return { background: tone, logo: source.kind === "provider" ? "icon" : "wordmark" };
}
