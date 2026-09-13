import { connection } from "next/server";

import { Effect } from "effect";

import { runAuthenticated } from "@/platform/auth/session";

import { defaultSettings } from "./settings";
import { SettingsStore } from "./settingsStore";

import type { Settings } from "./settings";

/** Saved preferences, falling back to the defaults when the data file cannot be read. */
export async function loadSettings(): Promise<Settings> {
  // Preferences are request-time data; opting in keeps them out of the static prerender.
  await connection();

  return runAuthenticated(
    Effect.flatMap(SettingsStore, (store) => store.read()).pipe(
      Effect.tapError((error) => Effect.logError("Saved settings could not be read", error)),
      Effect.catchAll(() => Effect.succeed(defaultSettings)),
    ),
  );
}
