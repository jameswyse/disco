import { cacheLife } from "next/cache";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { appRuntime } from "@/platform/runtime";

import type { MediaType } from "@/integrations/seerr/client";

export type MediaBackdrops = Readonly<Record<MediaType, string | undefined>>;

const firstBackdrop = (mediaType: MediaType) =>
  Effect.flatMap(SeerrClient, (client) => client.trending({ page: 1, mediaType })).pipe(
    Effect.map((page) => {
      for (const result of page.results) {
        if (result.mediaType !== "person" && result.backdropPath) {
          return result.backdropPath;
        }
      }

      return undefined;
    }),
    // Artwork is decoration; a Seerr hiccup should not take the sidebar down.
    Effect.catchAll(() => Effect.succeed(undefined)),
  );

/** Backdrops for the Movies and TV Shows cards, taken from this week's trending titles. */
export async function loadMediaBackdrops(): Promise<MediaBackdrops> {
  "use cache";
  cacheLife("days");

  const [movie, tv] = await appRuntime.runPromise(
    Effect.all([firstBackdrop("movie"), firstBackdrop("tv")], { concurrency: "unbounded" }),
  );

  return { movie, tv };
}
