import { Effect } from "effect";

import { runAuthenticated } from "@/platform/auth/session";

import { defaultViews } from "./views";
import { ViewStore } from "./viewStore";

import type { View } from "./views";

/** Saved sidebar views, falling back to the defaults when the data file cannot be read. */
export function loadViews(): Promise<readonly View[]> {
  return runAuthenticated(
    Effect.flatMap(ViewStore, (store) => store.read()).pipe(
      Effect.tapError((error) => Effect.logError("Saved views could not be read", error)),
      Effect.catchAll(() => Effect.succeed(defaultViews)),
    ),
  );
}
