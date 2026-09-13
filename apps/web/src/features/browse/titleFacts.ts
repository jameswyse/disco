import { cacheLife } from "next/cache";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { appRuntime } from "@/platform/runtime";

import type { MediaType } from "@/integrations/seerr/client";

import type { Title } from "./title";

/** Facts that only the per-title Seerr endpoints expose, shown under posters. */
export type TitleFacts = Readonly<{
  runtimeMinutes: number | undefined;
  seasonCount: number | undefined;
}>;

const factsProgram = (mediaType: MediaType, id: number) =>
  Effect.flatMap(SeerrClient, (client) =>
    mediaType === "movie"
      ? client.movie(id).pipe(
          Effect.map((movie): TitleFacts => ({
            runtimeMinutes: movie.runtime ?? undefined,
            seasonCount: undefined,
          })),
        )
      : client.tv(id).pipe(
          Effect.map((tv): TitleFacts => ({
            runtimeMinutes: tv.episodeRunTime?.[0],
            seasonCount: tv.numberOfSeasons ?? undefined,
          })),
        ),
  );

/**
 * Runtime and season count for one title. Cached for as long as Next allows: these change so
 * rarely that a stale value is better than a details request per card on every browse.
 */
export async function loadTitleFacts(mediaType: MediaType, id: number): Promise<TitleFacts> {
  "use cache";
  cacheLife("max");

  return appRuntime.runPromise(factsProgram(mediaType, id));
}

/** Attach facts to each title; a title whose details fail keeps its list data. */
export function withTitleFacts(titles: readonly Title[]): Promise<Title[]> {
  return Promise.all(
    titles.map(async (title) => {
      try {
        return { ...title, ...(await loadTitleFacts(title.mediaType, title.id)) };
      } catch {
        return title;
      }
    }),
  );
}
