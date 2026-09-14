import { connection } from "next/server";

import { cache } from "react";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

export type SeerrAccount =
  | Readonly<{
      kind: "ok";
      user: Readonly<{ displayName: string; avatarUrl: string | undefined }>;
      requests: Readonly<{ pending: number; processing: number }>;
    }>
  | Readonly<{ kind: "error"; message: string }>;

const accountProgram = Effect.gen(function* () {
  const client = yield* SeerrClient;
  const [user, requests] = yield* Effect.all([client.currentUser(), client.requestCount()], {
    concurrency: "unbounded",
  });

  return {
    kind: "ok",
    user: { displayName: user.displayName, avatarUrl: user.avatar ?? undefined },
    requests: { pending: requests.pending, processing: requests.processing },
  } satisfies SeerrAccount;
});

export const loadAccount = cache(async (): Promise<SeerrAccount> => {
  await connection();

  return runAuthenticated(
    accountProgram.pipe(
      Effect.tapError((error) => Effect.logError("Seerr account request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<SeerrAccount>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
});
