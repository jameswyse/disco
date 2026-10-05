import { connection } from "next/server";

import { Effect } from "effect";

import { runAuthenticated } from "@/platform/auth/session";

import { defaultSettings } from "./settings";
import { SettingsStore } from "./settingsStore";

import type { Settings } from "./settings";

export async function loadSettings(): Promise<Settings> {
  await connection();

  return runAuthenticated(
    Effect.flatMap(SettingsStore, (store) => store.read()).pipe(
      Effect.tapError((error) => Effect.logError("Saved settings could not be read", error)),
      Effect.catch(() => Effect.succeed(defaultSettings)),
    ),
  );
}
