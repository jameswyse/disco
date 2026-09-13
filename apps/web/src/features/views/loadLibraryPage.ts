import { connection } from "next/server";

import { Effect } from "effect";

import { loadSettings } from "@/features/settings/loadSettings";
import { SeerrClient } from "@/integrations/seerr/client";
import { appRuntime } from "@/platform/runtime";

import { isFeaturedLanguage, loadLibrary, searchKeywords } from "./library";
import { loadViews } from "./loadViews";

import type { LanguageOption } from "@/features/settings/PreferencesForm";
import type { Settings } from "@/features/settings/settings";

import type { Library, LibraryEntry, LibrarySection } from "./library";
import type { View } from "./views";

export type LibraryCategory = LibrarySection | "keywords" | "all";

export const libraryCategories: readonly Readonly<{ id: LibraryCategory; label: string }>[] = [
  { id: "all", label: "All" },
  { id: "streaming", label: "Streaming" },
  { id: "networks", label: "Networks" },
  { id: "studios", label: "Studios" },
  { id: "genres", label: "Genres" },
  { id: "languages", label: "Languages" },
  { id: "keywords", label: "Keywords" },
];

export function parseLibraryCategory(value: string | string[] | undefined): LibraryCategory {
  const candidate = Array.isArray(value) ? value[0] : value;

  return libraryCategories.find((category) => category.id === candidate)?.id ?? "all";
}

export type LibraryGroup = Readonly<{
  section: LibraryCategory;
  label: string;
  note: string | undefined;
  entries: readonly LibraryEntry[];
}>;

export type LibraryPageData = Readonly<{
  views: readonly View[];
  settings: Settings;
  /** Languages offered as the default filter: the featured set plus the current default. */
  languages: readonly LanguageOption[];
  groups: readonly LibraryGroup[];
  error: string | undefined;
}>;

function languageOptions(library: Library, settings: Settings): LanguageOption[] {
  return library.languages
    .filter(
      (entry) =>
        isFeaturedLanguage(entry) ||
        (entry.source.kind === "language" && entry.source.language === settings.defaultLanguage),
    )
    .flatMap((entry) =>
      entry.source.kind === "language" ? [{ code: entry.source.language, label: entry.label }] : [],
    );
}

const sectionLabels = {
  streaming: "Streaming services",
  networks: "Networks",
  studios: "Studios",
  genres: "Genres",
  languages: "Languages",
} satisfies Record<LibrarySection, string>;

function matches(entry: LibraryEntry, query: string): boolean {
  return entry.label.toLowerCase().includes(query.toLowerCase());
}

function sectionEntries(
  all: readonly LibraryEntry[],
  section: LibrarySection,
  query: string,
): readonly LibraryEntry[] {
  if (query !== "") {
    return all.filter((entry) => matches(entry, query));
  }

  // The full language list is long; without a search only the common ones are offered.
  return section === "languages" ? all.filter(isFeaturedLanguage) : all;
}

function sectionNote(section: LibrarySection, query: string, region: string): string | undefined {
  if (section === "streaming") {
    return `available in ${region}`;
  }

  return section === "languages" && query === "" ? "search for more" : undefined;
}

function groupsFor(
  library: Library,
  category: LibraryCategory,
  query: string,
  region: string,
): LibraryGroup[] {
  const sections: readonly LibrarySection[] = [
    "streaming",
    "networks",
    "studios",
    "genres",
    "languages",
  ];

  return sections
    .filter((section) => category === "all" || category === section)
    .map((section) => {
      return {
        section,
        label: sectionLabels[section],
        note: sectionNote(section, query, region),
        entries: sectionEntries(library[section], section, query),
      };
    })
    .filter((group) => group.entries.length > 0);
}

export async function loadLibraryPage(
  category: LibraryCategory,
  query: string,
): Promise<LibraryPageData> {
  await connection();

  const [views, settings] = await Promise.all([loadViews(), loadSettings()]);

  try {
    const region = await appRuntime.runPromise(
      Effect.flatMap(SeerrClient, (client) => client.publicSettings()).pipe(
        Effect.map((seerr) => seerr.streamingRegion || seerr.discoverRegion || "US"),
      ),
    );
    const [library, keywords] = await Promise.all([
      loadLibrary(region),
      query !== "" && (category === "all" || category === "keywords")
        ? searchKeywords(query)
        : Promise.resolve([]),
    ]);
    const groups = groupsFor(library, category, query, region);

    if (keywords.length > 0) {
      groups.push({ section: "keywords", label: "Keywords", note: undefined, entries: keywords });
    }

    return {
      views,
      settings,
      languages: languageOptions(library, settings),
      groups,
      error: undefined,
    };
  } catch (error) {
    // Failures are logged where they happen (see `library.ts`); the page only needs a summary.
    return {
      views,
      settings,
      languages: [],
      groups: [],
      error: `The Seerr catalogue could not be loaded${error instanceof Error && error.message ? `: ${error.message}` : "."}`,
    };
  }
}
