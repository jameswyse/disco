import { connection } from "next/server";

import { Effect } from "effect";

import { titleFromResult } from "@/features/browse/title";
import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

export async function loadPerson(id: number) {
  await connection();

  return runAuthenticated(
    Effect.gen(function* () {
      const client = yield* SeerrClient;
      const [person, credits, movies, tv] = yield* Effect.all(
        [client.person(id), client.personCredits(id), client.genres("movie"), client.genres("tv")],
        { concurrency: "unbounded" },
      );
      const genres = new Map([...movies, ...tv].map((genre) => [genre.id, genre.name]));
      const unique = new Map(
        [...credits.cast, ...credits.crew].map((credit) => [
          `${credit.mediaType}-${credit.id}`,
          titleFromResult(credit, genres),
        ]),
      );

      return {
        kind: "ok" as const,
        person,
        titles: [...unique.values()].sort(
          (a, b) => (b.year ?? 0) - (a.year ?? 0) || b.popularity - a.popularity,
        ),
      };
    }).pipe(
      Effect.tapError((error) => Effect.logError("Seerr person request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed(
          error._tag === "SeerrRejected" && error.status === 404
            ? { kind: "not-found" as const }
            : { kind: "error" as const, message: describeSeerrError(error) },
        ),
      ),
    ),
  );
}
