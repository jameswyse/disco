import { connection } from "next/server";

import { Effect } from "effect";

import { titleFromResult } from "@/features/browse/title";
import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { appRuntime } from "@/platform/runtime";

import { titleDetailsFromMovie, titleDetailsFromTv } from "./titleDetails";

import type { GenreNames, Title } from "@/features/browse/title";
import type { MediaType } from "@/integrations/seerr/client";
import type { SeerrError } from "@/integrations/seerr/errors";

import type { TitleDetails } from "./titleDetails";

export type TitleDetailsResult =
  | Readonly<{
      kind: "ok";
      details: TitleDetails;
      related: readonly Title[];
      region: string;
      seerrOrigin: string;
    }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "error"; message: string }>;

function detailsProgram(
  mediaType: MediaType,
  id: number,
): Effect.Effect<TitleDetailsResult, SeerrError, SeerrClient> {
  return Effect.gen(function* () {
    const client = yield* SeerrClient;
    const settings = yield* client.publicSettings();
    const region = settings.streamingRegion || settings.discoverRegion || "US";
    const today = new Date().toISOString().slice(0, 10);
    const ratingsOrNothing = <A>(ratings: Effect.Effect<A, SeerrError>) =>
      ratings.pipe(Effect.catchAll(() => Effect.succeed(undefined)));

    const [details, recommendations, movieGenres, tvGenres] = yield* Effect.all(
      [
        mediaType === "movie"
          ? Effect.all([client.movie(id), ratingsOrNothing(client.movieRatings(id))]).pipe(
              Effect.map(([movie, ratings]) =>
                titleDetailsFromMovie(movie, ratings, region, today),
              ),
            )
          : Effect.all([client.tv(id), ratingsOrNothing(client.tvRatings(id))]).pipe(
              Effect.map(([tv, ratings]) => titleDetailsFromTv(tv, ratings, region, today)),
            ),
        client.recommendations(mediaType, id),
        client.genres("movie"),
        client.genres("tv"),
      ],
      { concurrency: "unbounded" },
    );
    const genreNames: GenreNames = new Map(
      [...movieGenres, ...tvGenres].map((genre) => [genre.id, genre.name]),
    );

    return {
      kind: "ok",
      details,
      related: recommendations.results
        .slice(0, 8)
        .map((result) => titleFromResult(result, genreNames)),
      region,
      seerrOrigin: client.origin.origin,
    };
  });
}

export async function loadTitleDetails(
  mediaType: MediaType,
  id: number,
): Promise<TitleDetailsResult> {
  await connection();

  return appRuntime.runPromise(
    detailsProgram(mediaType, id).pipe(
      Effect.catchTag("SeerrRejected", (error) =>
        error.status === 404
          ? Effect.succeed<TitleDetailsResult>({ kind: "not-found" })
          : Effect.fail(error),
      ),
      Effect.tapError((error) => Effect.logError("Seerr title request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<TitleDetailsResult>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
