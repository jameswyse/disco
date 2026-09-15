import { connection } from "next/server";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { requireSession, runAuthenticated } from "@/platform/auth/session";

import { canManageBlocklist } from "./blocklist";
import { requestedProfileName } from "./qualityProfiles";
import { titleFromResult } from "./title";
import { titleDetailsFromMovie, titleDetailsFromTv } from "./titleDetails";
import { tvAvailabilityProgram } from "./tvAvailability";

import type { PlexLibrary } from "@/integrations/plex/library";
import type { MediaType } from "@/integrations/seerr/client";
import type { SeerrError } from "@/integrations/seerr/errors";
import type { SeerrIdentity } from "@/integrations/seerr/identity";

import type { GenreNames, Title } from "./title";
import type { TitleDetails } from "./titleDetails";

export type TitleDetailsResult =
  | Readonly<{
      kind: "ok";
      details: TitleDetails;
      related: readonly Title[];
      region: string;
      seerrOrigin: string;
      canManageBlocklist: boolean;
    }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "error"; message: string }>;

function detailsProgram(
  mediaType: MediaType,
  id: number,
  canManage: boolean,
): Effect.Effect<TitleDetailsResult, SeerrError, SeerrClient | SeerrIdentity | PlexLibrary> {
  return Effect.gen(function* () {
    const client = yield* SeerrClient;
    const settings = yield* client.publicSettings();
    const region = settings.streamingRegion || settings.discoverRegion || "US";
    const today = new Date().toISOString().slice(0, 10);
    const ratingsOrNothing = <A>(ratings: Effect.Effect<A, SeerrError, SeerrIdentity>) =>
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
              Effect.flatMap(([tv, ratings]) =>
                tvAvailabilityProgram(tv, today).pipe(
                  Effect.map((availability) => ({
                    ...titleDetailsFromTv(tv, ratings, region, today),
                    ...availability,
                  })),
                ),
              ),
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

    const requests = yield* Effect.all(
      details.requests.map((request) =>
        requestedProfileName(mediaType, {
          profileName: request.qualityProfile,
          profileId: request.profileId,
          serverId: request.serverId,
        }).pipe(Effect.map((qualityProfile) => ({ ...request, qualityProfile }))),
      ),
      { concurrency: 4 },
    );

    return {
      kind: "ok",
      details: { ...details, requests },
      related: recommendations.results
        .slice(0, 8)
        .map((result) => titleFromResult(result, genreNames)),
      region,
      seerrOrigin: client.origin.origin,
      canManageBlocklist: canManage,
    };
  });
}

export async function loadTitleDetails(
  mediaType: MediaType,
  id: number,
): Promise<TitleDetailsResult> {
  await connection();
  const { user } = await requireSession();

  return runAuthenticated(
    detailsProgram(mediaType, id, canManageBlocklist(user.permissions)).pipe(
      Effect.catchTag("SeerrRejected", (error) =>
        error.status === 404 && error.path === `${mediaType}/${id}`
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
