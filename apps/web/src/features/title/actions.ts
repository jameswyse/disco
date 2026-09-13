"use server";

import { revalidatePath } from "next/cache";

import { Effect, Schema } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { appRuntime } from "@/platform/runtime";

import type { CreateRequestBody } from "@/integrations/seerr/client";
import type { SeerrError } from "@/integrations/seerr/errors";

const MediaTypeInput = Schema.Literal("movie", "tv");
const TmdbId = Schema.NumberFromString.pipe(Schema.int(), Schema.positive());

const RequestInput = Schema.Struct({
  mediaType: MediaTypeInput,
  id: TmdbId,
  /** Season number for a partial series request; omitted means every season. */
  season: Schema.optional(TmdbId),
});
const WatchlistInput = Schema.Struct({
  mediaType: MediaTypeInput,
  id: TmdbId,
  title: Schema.NonEmptyString,
  action: Schema.Literal("add", "remove"),
});

const decodeRequest = Schema.decodeUnknownSync(RequestInput);
const decodeWatchlist = Schema.decodeUnknownSync(WatchlistInput);

export type ActionResult = Readonly<{ ok: true }> | Readonly<{ ok: false; message: string }>;

function run(
  program: Effect.Effect<unknown, SeerrError, SeerrClient>,
  paths: readonly string[],
): Promise<ActionResult> {
  return appRuntime.runPromise(
    program.pipe(
      Effect.tapError((error) => Effect.logError("Seerr action failed", error)),
      Effect.map((): ActionResult => ({ ok: true })),
      Effect.catchAll((error) =>
        Effect.succeed<ActionResult>({ ok: false, message: describeSeerrError(error) }),
      ),
      Effect.tap(() =>
        Effect.sync(() => {
          for (const path of paths) {
            revalidatePath(path);
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
  const input = decodeRequest(Object.fromEntries(formData));
  const body: CreateRequestBody =
    input.mediaType === "tv"
      ? {
          mediaType: "tv",
          mediaId: input.id,
          seasons: input.season === undefined ? "all" : [input.season],
        }
      : { mediaType: "movie", mediaId: input.id };

  return run(
    Effect.flatMap(SeerrClient, (client) => client.createRequest(body)),
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
