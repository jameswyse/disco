import { connection } from "next/server";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { appRuntime } from "@/platform/runtime";

import { loadViews } from "./loadViews";

import type { View } from "./views";

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

export async function loadSidebarViews(): Promise<readonly View[]> {
  // Saved views are request-time data; opting in explicitly keeps the Effect runtime's clock
  // access out of the static prerender.
  await connection();

  return loadViews();
}

export async function loadAccount(): Promise<SeerrAccount> {
  await connection();

  return appRuntime.runPromise(
    accountProgram.pipe(
      Effect.tapError((error) => Effect.logError("Seerr account request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<SeerrAccount>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
