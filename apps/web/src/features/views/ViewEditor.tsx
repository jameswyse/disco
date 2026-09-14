"use client";

import { createContext, use, useOptimistic, useState, useTransition } from "react";

import { addView, placeView, removeView } from "./actions";
import { applyViewEdit } from "./viewEdits";

import type { ReactNode } from "react";

import type { LibraryEntry } from "./library";
import type { ViewEdit } from "./viewEdits";
import type { View } from "./views";

type DraggedView =
  | Readonly<{ kind: "sidebar"; id: string }>
  | Readonly<{ kind: "library"; entry: LibraryEntry }>;

function useEditor(savedViews: readonly View[]) {
  const [views, updateOptimisticViews] = useOptimistic(savedViews, applyViewEdit);
  const [dragged, setDragged] = useState<DraggedView | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function save(edit: ViewEdit, action: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      updateOptimisticViews(edit);

      try {
        await action();
      } catch {
        setError("Could not save the sidebar. Your change was undone. Try again.");
      }
    });
  }

  function add(entry: LibraryEntry, beforeId?: string) {
    const data = new FormData();
    data.set("label", entry.label);
    data.set("source", JSON.stringify(entry.source));

    if (entry.logoPath !== undefined) {
      data.set("logoPath", entry.logoPath);
    }

    if (entry.backdropPath !== undefined) {
      data.set("backdropPath", entry.backdropPath);
    }

    if (beforeId !== undefined) {
      data.set("beforeId", beforeId);
    }

    save({ kind: "add", entry, beforeId }, () => addView(data));
  }

  function drop(beforeId?: string) {
    setDragged(null);

    if (pending || dragged === null) {
      return;
    }

    if (dragged.kind === "library") {
      add(dragged.entry, beforeId);
    } else {
      const data = new FormData();
      data.set("id", dragged.id);

      if (beforeId !== undefined) {
        data.set("beforeId", beforeId);
      }

      save({ kind: "place", id: dragged.id, beforeId }, () => placeView(data));
    }
  }

  function move(id: string, direction: "up" | "down") {
    const data = new FormData();
    data.set("id", id);
    const reordered = applyViewEdit(views, { kind: "move", id, direction });
    const beforeId = reordered[reordered.findIndex((view) => view.id === id) + 1]?.id;

    if (beforeId !== undefined) {
      data.set("beforeId", beforeId);
    }

    save({ kind: "place", id, beforeId }, () => placeView(data));
  }

  function remove(id: string) {
    const data = new FormData();
    data.set("id", id);
    save({ kind: "remove", id }, () => removeView(data));
  }

  return { views, dragged, setDragged, pending, error, add, drop, move, remove };
}

const ViewEditorContext = createContext<ReturnType<typeof useEditor> | null>(null);

export function ViewEditor({
  children,
  views,
}: Readonly<{ children: ReactNode; views: readonly View[] }>) {
  const editor = useEditor(views);

  return <ViewEditorContext value={editor}>{children}</ViewEditorContext>;
}

export function useViewEditor() {
  const editor = use(ViewEditorContext);

  if (editor === null) {
    throw new Error("ViewEditor is required for sidebar editing.");
  }

  return editor;
}
