"use server";

import { revalidatePath } from "next/cache";

import { Effect, Schema } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { SeerrRejected, describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

import { requestProfiles } from "./qualityProfiles";

import type { CreateRequestBody } from "@/integrations/seerr/client";
import type { SeerrError } from "@/integrations/seerr/errors";
import type { SeerrIdentity } from "@/integrations/seerr/identity";

const MediaTypeInput = Schema.Literal("movie", "tv");
const TmdbId = Schema.NumberFromString.pipe(Schema.int(), Schema.positive());

const RequestInput = Schema.Struct({
  mediaType: MediaTypeInput,
  id: TmdbId,
  /** Season number for a partial series request; omitted means every season. */
  season: Schema.optional(TmdbId),
  quality: Schema.optional(Schema.String.pipe(Schema.pattern(/^(?:\d+:\d+)?$/))),
});
const WatchlistInput = Schema.Struct({
  mediaType: MediaTypeInput,
  id: TmdbId,
  title: Schema.NonEmptyString,
  action: Schema.Literal("add", "remove"),
});

const decodeWatchlist = Schema.decodeUnknownSync(WatchlistInput);

export type ActionResult = Readonly<{ ok: true }> | Readonly<{ ok: false; message: string }>;

function run(
  program: Effect.Effect<unknown, SeerrError, SeerrClient | SeerrIdentity>,
  paths: readonly string[],
): Promise<ActionResult> {
  return runAuthenticated(
    program.pipe(
      Effect.tapError((error) => Effect.logError("Seerr action failed", error)),
      Effect.map((): ActionResult => ({ ok: true })),
      Effect.catchAll((error) =>
        Effect.succeed<ActionResult>({ ok: false, message: describeSeerrError(error) }),
      ),
      Effect.tap((result) =>
        Effect.sync(() => {
          if (!result.ok) {
            return;
          }

          for (const path of paths) {
            if (path === "/") {
              revalidatePath(path, "layout");
            } else {
              revalidatePath(path);
            }
          }
        }),
      ),
    ),
  );
}

/** Ask Seerr to request a film, a whole series or one season. */
export async function requestTitle(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const decoded = Schema.decodeUnknownEither(RequestInput)(Object.fromEntries(formData));

  if (decoded._tag === "Left") {
    return { ok: false, message: "Choose a valid title and quality profile." };
  }

  const input = decoded.right;
  const body: CreateRequestBody =
    input.mediaType === "tv"
      ? {
          mediaType: "tv",
          mediaId: input.id,
          seasons: input.season === undefined ? "all" : [input.season],
        }
      : { mediaType: "movie", mediaId: input.id };

  return run(
    Effect.gen(function* () {
      const client = yield* SeerrClient;

      if (!input.quality) {
        return yield* client.createRequest(body);
      }

      const options = yield* requestProfiles(input.mediaType);
      const profile = options.profiles.find((option) => option.key === input.quality);

      if (!profile) {
        return yield* Effect.fail(new SeerrRejected({ path: "request", status: 403 }));
      }

      return yield* client.createRequest({
        ...body,
        serverId: profile.serverId,
        profileId: profile.profileId,
        is4k: profile.is4k,
      });
    }),
    [`/title/${input.mediaType}/${input.id}`, "/", "/requests"],
  );
}

export async function toggleWatchlist(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const input = decodeWatchlist(Object.fromEntries(formData));

  return run(
    Effect.flatMap(SeerrClient, (client) =>
      input.action === "add"
        ? client.addToWatchlist({
            tmdbId: input.id,
            mediaType: input.mediaType,
            title: input.title,
          })
        : client.removeFromWatchlist(input.id, input.mediaType),
    ),
    [`/title/${input.mediaType}/${input.id}`],
  );
}
