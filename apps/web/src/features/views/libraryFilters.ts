import type { LibrarySection } from "./library";

export type LibraryCategory = LibrarySection | "all";

export const libraryCategories: readonly Readonly<{ id: LibraryCategory; label: string }>[] = [
  { id: "all", label: "All" },
  { id: "streaming", label: "Streaming" },
  { id: "networks", label: "Networks" },
  { id: "studios", label: "Studios" },
  { id: "genres", label: "Genres" },
];

export function parseLibraryCategory(value: string | string[] | undefined): LibraryCategory {
  const candidate = Array.isArray(value) ? value[0] : value;

  return libraryCategories.find((category) => category.id === candidate)?.id ?? "all";
}
