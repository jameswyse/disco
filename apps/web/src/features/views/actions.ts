"use server";

import { revalidatePath } from "next/cache";

import { Effect, Schema } from "effect";

import { runAuthenticated } from "@/platform/auth/session";

import { applyViewEdit } from "./viewEdits";
import { ViewSource } from "./views";
import { ViewStore } from "./viewStore";

import type { View } from "./views";

const AddViewInput = Schema.Struct({
  label: Schema.NonEmptyTrimmedString,
  source: Schema.parseJson(ViewSource),
  logoPath: Schema.optional(Schema.NonEmptyString),
  backdropPath: Schema.optional(Schema.NonEmptyString),
  beforeId: Schema.optional(Schema.NonEmptyString),
});
const PlaceViewInput = Schema.Struct({
  id: Schema.NonEmptyString,
  beforeId: Schema.optional(Schema.NonEmptyString),
});
const RemoveViewInput = Schema.Struct({ id: Schema.NonEmptyString });

const decodeAdd = Schema.decodeUnknownSync(AddViewInput);
const decodePlace = Schema.decodeUnknownSync(PlaceViewInput);
const decodeRemove = Schema.decodeUnknownSync(RemoveViewInput);

async function updateViews(update: (views: readonly View[]) => readonly View[]): Promise<void> {
  await runAuthenticated(Effect.flatMap(ViewStore, (store) => store.update(update)));
  revalidatePath("/", "layout");
}

export async function addView(formData: FormData): Promise<void> {
  const input = decodeAdd(Object.fromEntries(formData));
  await updateViews((views) =>
    applyViewEdit(views, {
      kind: "add",
      entry: {
        label: input.label,
        source: input.source,
        logoPath: input.logoPath,
        backdropPath: input.backdropPath,
      },
      beforeId: input.beforeId,
    }),
  );
}

export async function removeView(formData: FormData): Promise<void> {
  const { id } = decodeRemove(Object.fromEntries(formData));
  await updateViews((views) => applyViewEdit(views, { kind: "remove", id }));
}

export async function placeView(formData: FormData): Promise<void> {
  const { id, beforeId } = decodePlace(Object.fromEntries(formData));
  await updateViews((views) => applyViewEdit(views, { kind: "place", id, beforeId }));
}
