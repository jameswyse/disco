"use server";

import { revalidatePath } from "next/cache";

import { Effect, Schema } from "effect";

import { runAuthenticated } from "@/platform/auth/session";

import { sameSource, uniqueViewId, ViewSource } from "./views";
import { ViewStore } from "./viewStore";

import type { MutableView, View } from "./views";

const AddViewInput = Schema.Struct({
  label: Schema.NonEmptyTrimmedString,
  source: Schema.parseJson(ViewSource),
  logoPath: Schema.optional(Schema.NonEmptyString),
  backdropPath: Schema.optional(Schema.NonEmptyString),
});
const MoveViewInput = Schema.Struct({
  id: Schema.NonEmptyString,
  direction: Schema.Literal("up", "down"),
});
const RemoveViewInput = Schema.Struct({ id: Schema.NonEmptyString });

const decodeAdd = Schema.decodeUnknownSync(AddViewInput);
const decodeMove = Schema.decodeUnknownSync(MoveViewInput);
const decodeRemove = Schema.decodeUnknownSync(RemoveViewInput);

async function updateViews(update: (views: readonly View[]) => readonly View[]): Promise<void> {
  await runAuthenticated(Effect.flatMap(ViewStore, (store) => store.update(update)));
  revalidatePath("/", "layout");
}

export async function addView(formData: FormData): Promise<void> {
  const input = decodeAdd(Object.fromEntries(formData));

  await updateViews((views) => {
    if (views.some((view) => sameSource(view.source, input.source))) {
      return views;
    }

    const view: MutableView = {
      id: uniqueViewId(input.label, views),
      label: input.label,
      source: input.source,
    };

    if (input.logoPath !== undefined) {
      view.logoPath = input.logoPath;
    }

    if (input.backdropPath !== undefined) {
      view.backdropPath = input.backdropPath;
    }

    return [...views, view];
  });
}

export async function removeView(formData: FormData): Promise<void> {
  const { id } = decodeRemove(Object.fromEntries(formData));

  await updateViews((views) => views.filter((view) => view.id !== id));
}

export async function moveView(formData: FormData): Promise<void> {
  const { id, direction } = decodeMove(Object.fromEntries(formData));

  await updateViews((views) => {
    const index = views.findIndex((view) => view.id === id);
    const target = direction === "up" ? index - 1 : index + 1;

    if (index === -1 || target < 0 || target >= views.length) {
      return views;
    }

    const reordered = [...views];
    const [moved] = reordered.splice(index, 1);

    if (moved !== undefined) {
      reordered.splice(target, 0, moved);
    }

    return reordered;
  });
}
