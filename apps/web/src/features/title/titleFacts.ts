import { cacheLife } from "next/cache";
import { connection } from "next/server";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { SeerrIdentity } from "@/integrations/seerr/identity";
import { requireSession } from "@/platform/auth/session";
import { appRuntime } from "@/platform/runtime";

import { tvAvailabilityProgram } from "./tvAvailability";

import type { MediaType } from "@/integrations/seerr/client";
import type { SeerrUserId } from "@/integrations/seerr/schemas";

import type { Title } from "./title";

/** Facts that only the per-title Seerr endpoints expose, shown under posters. */
export type TitleFacts = Readonly<{
  runtimeMinutes: number | undefined;
  seasonCount: number | undefined;
  availability?: Title["availability"] | undefined;
  availabilityDetail?: string | undefined;
  airing?: string | undefined;
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
          Effect.flatMap((tv) =>
            tvAvailabilityProgram(tv, new Date().toISOString().slice(0, 10)).pipe(
              Effect.map(({ availability, availabilityDetail, airing }): TitleFacts => ({
                runtimeMinutes: tv.episodeRunTime?.[0],
                seasonCount: tv.numberOfSeasons ?? undefined,
                availability,
                availabilityDetail,
                airing,
              })),
            ),
          ),
        ),
  );

/** TV facts include availability, so they refresh as episodes air and arrive in the library. */

async function cachedTitleFacts(
  mediaType: MediaType,
  id: number,
  userId: SeerrUserId,
): Promise<TitleFacts> {
  "use cache";

  if (mediaType === "tv") {
    cacheLife("minutes");
  } else {
    cacheLife("max");
  }

  return appRuntime.runPromise(
    factsProgram(mediaType, id).pipe(Effect.provideService(SeerrIdentity, { userId })),
  );
}

export async function loadTitleFacts(mediaType: MediaType, id: number): Promise<TitleFacts> {
  await connection();
  const { user } = await requireSession();

  return cachedTitleFacts(mediaType, id, user.id);
}

/** Attach facts to each title; a title whose details fail keeps its list data. */
export function withTitleFacts(titles: readonly Title[]): Promise<Title[]> {
  return Promise.all(
    titles.map(async (title) => {
      try {
        const facts = await loadTitleFacts(title.mediaType, title.id);

        return {
          ...title,
          ...facts,
          availability:
            title.availability === "blocklisted"
              ? title.availability
              : (facts.availability ?? title.availability),
        };
      } catch {
        return title;
      }
    }),
  );
}
