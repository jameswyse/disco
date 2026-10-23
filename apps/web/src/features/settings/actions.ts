"use server";

import { revalidatePath } from "next/cache";

import { Effect, Schema } from "effect";

import { requireSession, runWithSession } from "@/platform/auth/session";

import { LogoStyle, PreviewMode, SidebarStyle } from "./settings";
import { SettingsStore } from "./settingsStore";

import type { MutableSettings } from "./settings";

const languagePattern = /^[a-z]{2}$/;

const UpdateSettingsInput = Schema.Struct({
  defaultLanguage: Schema.optional(
    Schema.Union([
      Schema.Literal(""),
      Schema.String.pipe(Schema.check(Schema.isPattern(languagePattern))),
    ]),
  ),
  previewMode: Schema.optional(PreviewMode),
  sidebarStyle: Schema.optional(SidebarStyle),
  logoStyle: Schema.optional(LogoStyle),
});

const decodeUpdate = Schema.decodeUnknownSync(UpdateSettingsInput);

export async function updateSettings(formData: FormData): Promise<void> {
  const session = await requireSession();
  const input = decodeUpdate(Object.fromEntries(formData));

  await runWithSession(
    session,
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

        if (input.logoStyle !== undefined) {
          next.logoStyle = input.logoStyle;
        }

        return next;
      }),
    ),
  );
  revalidatePath("/", "layout");
}
