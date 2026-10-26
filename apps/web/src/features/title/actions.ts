"use server";

import { revalidatePath } from "next/cache";

import { Effect, Schema } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { SeerrRejected, describeSeerrError } from "@/integrations/seerr/errors";
import { requireSession, runWithSession } from "@/platform/auth/session";

import { canManageBlocklist } from "./blocklist";
import { requestProfiles } from "./qualityProfiles";

import type { CreateRequestBody } from "@/integrations/seerr/client";
import type { SeerrError } from "@/integrations/seerr/errors";
import type { SeerrIdentity } from "@/integrations/seerr/identity";
import type { VerifiedSession } from "@/platform/auth/session";

import type { RequestedAvailability } from "./title";

const MediaTypeInput = Schema.Literals(["movie", "tv"]);

const TmdbId = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0)),
);

const RequestInput = Schema.Struct({
  mediaType: MediaTypeInput,
  id: TmdbId,
  season: Schema.optional(TmdbId),
  quality: Schema.optional(Schema.String.pipe(Schema.check(Schema.isPattern(/^(?:\d+:\d+)?$/)))),
});

const WatchlistInput = Schema.Struct({
  mediaType: MediaTypeInput,
  id: TmdbId,
  title: Schema.NonEmptyString,
  action: Schema.Literals(["add", "remove"]),
});

const decodeWatchlist = Schema.decodeUnknownSync(WatchlistInput);

type ActionFailure = Readonly<{ ok: false; message: string }>;
export type ActionResult = Readonly<{ ok: true }> | ActionFailure;
export type RequestResult =
  | Readonly<{ ok: true; availability: RequestedAvailability }>
  | ActionFailure;

const succeeded = { ok: true } as const;
const approvedRequestStatus = 2;

function run<Success extends Readonly<{ ok: true }>>(
  session: VerifiedSession,
  program: Effect.Effect<Success, SeerrError, SeerrClient | SeerrIdentity>,
  paths: readonly string[],
): Promise<Success | ActionFailure> {
  return runWithSession(
    session,
    program.pipe(
      Effect.tapError((error) => Effect.logError("Seerr action failed", error)),
      Effect.catch((error) =>
        Effect.succeed<ActionFailure>({ ok: false, message: describeSeerrError(error) }),
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

export async function requestTitle(
  _previous: RequestResult | undefined,
  formData: FormData,
): Promise<RequestResult> {
  const session = await requireSession();
  const decoded = Schema.decodeUnknownResult(RequestInput)(Object.fromEntries(formData));

  if (decoded._tag === "Failure") {
    return { ok: false, message: "Choose a valid title and quality profile." };
  }

  const input = decoded.success;

  const body: CreateRequestBody =
    input.mediaType === "tv"
      ? {
          mediaType: "tv",
          mediaId: input.id,
          seasons: input.season === undefined ? "all" : [input.season],
        }
      : { mediaType: "movie", mediaId: input.id };

  return run(
    session,
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
    }).pipe(
      Effect.map((created) => ({
        ok: true as const,
        availability:
          created.status === approvedRequestStatus ? ("processing" as const) : ("pending" as const),
      })),
    ),
    [`/title/${input.mediaType}/${input.id}`, "/", "/requests"],
  );
}

export async function toggleWatchlist(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
  const input = decodeWatchlist(Object.fromEntries(formData));

  return run(
    session,
    Effect.flatMap(SeerrClient, (client) =>
      input.action === "add"
        ? client.addToWatchlist({
            tmdbId: input.id,
            mediaType: input.mediaType,
            title: input.title,
          })
        : client.removeFromWatchlist(input.id, input.mediaType),
    ).pipe(Effect.as(succeeded)),
    [`/title/${input.mediaType}/${input.id}`],
  );
}

export async function toggleBlocklist(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
  const decoded = Schema.decodeUnknownResult(WatchlistInput)(Object.fromEntries(formData));

  if (decoded._tag === "Failure") {
    return { ok: false, message: "Choose a valid title and blocklist action." };
  }

  if (!canManageBlocklist(session.user.permissions)) {
    return { ok: false, message: "You don't have permission to manage Seerr's blocklist." };
  }

  const input = decoded.success;

  return run(
    session,
    Effect.flatMap(SeerrClient, (client) =>
      input.action === "add"
        ? client.addToBlocklist({
            tmdbId: input.id,
            mediaType: input.mediaType,
            title: input.title,
          })
        : client.removeFromBlocklist(input.id, input.mediaType),
    ).pipe(Effect.as(succeeded)),
    ["/"],
  );
}
