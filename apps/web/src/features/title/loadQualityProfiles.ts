"use server";
import { Effect, Schema } from "effect";

import { describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

import { requestProfiles } from "./qualityProfiles";

export async function loadQualityProfiles(mediaType: string) {
  const type = Schema.decodeUnknownSync(Schema.Literal("movie", "tv"))(mediaType);

  return runAuthenticated(
    requestProfiles(type).pipe(
      Effect.tapError((error) => Effect.logError("Seerr quality profiles failed", error)),
      Effect.map((result) => ({ kind: "ok" as const, ...result })),
      Effect.catchAll((error) =>
        Effect.succeed({ kind: "error" as const, message: describeSeerrError(error) }),
      ),
    ),
  );
}
