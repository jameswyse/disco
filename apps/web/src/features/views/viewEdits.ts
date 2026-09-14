import { sameSource, uniqueViewId } from "./views";

import type { LibraryEntry } from "./library";
import type { MutableView, View } from "./views";

export type ViewEdit =
  | Readonly<{
      kind: "add";
      entry: Pick<LibraryEntry, "label" | "source" | "logoPath" | "backdropPath">;
      beforeId: string | undefined;
    }>
  | Readonly<{ kind: "remove"; id: string }>
  | Readonly<{ kind: "place"; id: string; beforeId: string | undefined }>
  | Readonly<{ kind: "move"; id: string; direction: "up" | "down" }>;

function insert(views: readonly View[], view: View, beforeId: string | undefined): readonly View[] {
  const index = views.findIndex((item) => item.id === beforeId);
  const result = [...views];
  result.splice(index === -1 ? result.length : index, 0, view);

  return result;
}

export function applyViewEdit(views: readonly View[], edit: ViewEdit): readonly View[] {
  switch (edit.kind) {
    case "add": {
      if (views.some((view) => sameSource(view.source, edit.entry.source))) {
        return views;
      }

      const view: MutableView = {
        id: uniqueViewId(edit.entry.label, views),
        label: edit.entry.label,
        source: edit.entry.source,
      };

      if (edit.entry.logoPath !== undefined) {
        view.logoPath = edit.entry.logoPath;
      }

      if (edit.entry.backdropPath !== undefined) {
        view.backdropPath = edit.entry.backdropPath;
      }

      return insert(views, view, edit.beforeId);
    }

    case "remove":
      return views.filter((view) => view.id !== edit.id);

    case "place": {
      const view = views.find((item) => item.id === edit.id);

      if (view === undefined || edit.id === edit.beforeId) {
        return views;
      }

      return insert(
        views.filter((item) => item.id !== edit.id),
        view,
        edit.beforeId,
      );
    }

    case "move": {
      const index = views.findIndex((view) => view.id === edit.id);
      const target = edit.direction === "up" ? index - 1 : index + 1;

      if (index === -1 || target < 0 || target >= views.length) {
        return views;
      }

      const reordered = [...views];
      const [moved] = reordered.splice(index, 1);

      if (moved !== undefined) {
        reordered.splice(target, 0, moved);
      }

      return reordered;
    }

    default: {
      const unsupported: never = edit;

      return unsupported;
    }
  }
}
