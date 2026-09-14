"use server";

import { revalidatePath } from "next/cache";

import { Effect, Schema } from "effect";

import { runAuthenticated } from "@/platform/auth/session";

import { PreviewMode, SidebarStyle } from "./settings";
import { SettingsStore } from "./settingsStore";

import type { MutableSettings } from "./settings";

const languagePattern = /^[a-z]{2}$/;

/** An empty value clears the default. */
const UpdateSettingsInput = Schema.Struct({
  defaultLanguage: Schema.optional(
    Schema.Union(Schema.Literal(""), Schema.String.pipe(Schema.pattern(languagePattern))),
  ),
  previewMode: Schema.optional(PreviewMode),
  sidebarStyle: Schema.optional(SidebarStyle),
});
const decodeUpdate = Schema.decodeUnknownSync(UpdateSettingsInput);

export async function updateSettings(formData: FormData): Promise<void> {
  const input = decodeUpdate(Object.fromEntries(formData));

  await runAuthenticated(
    Effect.flatMap(SettingsStore, (store) =>
      store.update((settings) => {
        const next: MutableSettings = { ...settings };

        if (input.defaultLanguage !== undefined) {
          if (input.defaultLanguage === "") {
            delete next.defaultLanguage;
          } else {
            next.defaultLanguage = input.defaultLanguage;
          }
        }

        if (input.previewMode !== undefined) {
          next.previewMode = input.previewMode;
        }

        if (input.sidebarStyle !== undefined) {
          next.sidebarStyle = input.sidebarStyle;
        }

        return next;
      }),
    ),
  );
  revalidatePath("/", "layout");
}
