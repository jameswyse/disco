import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { runAuthenticated } from "@/platform/auth/session";

import { loadSettings } from "./loadSettings";

export async function loadPreferences() {
  const settings = await loadSettings();
  const languages = await runAuthenticated(
    Effect.flatMap(SeerrClient, (client) => client.languages()).pipe(
      Effect.map((options) => ({
        kind: "ok" as const,
        options: options
          .filter((language) => language.english_name !== "")
          .map((language) => ({ code: language.iso_639_1, label: language.english_name }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      })),
      Effect.tapError((error) =>
        Effect.logError("Preference languages could not be loaded", error),
      ),
      Effect.catchAll(() => Effect.succeed({ kind: "error" as const })),
    ),
  );

  return { settings, languages };
}
