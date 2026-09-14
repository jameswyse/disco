import { connection } from "next/server";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { runAuthenticated } from "@/platform/auth/session";

import { loadLibrary } from "./library";

import type { WatchProviderRegion } from "@/integrations/seerr/schemas";

import type { Library, LibraryEntry, LibrarySection } from "./library";
import type { LibraryCategory } from "./libraryFilters";

export type LibraryGroup = Readonly<{
  section: LibraryCategory;
  label: string;
  entries: readonly LibraryEntry[];
}>;

export type LibraryPageData = Readonly<{
  country: string;
  countries: readonly WatchProviderRegion[];
  groups: readonly LibraryGroup[];
  error: string | undefined;
}>;

const sectionLabels = {
  streaming: "Streaming services",
  networks: "Networks",
  studios: "Studios",
  genres: "Genres",
} satisfies Record<LibrarySection, string>;

function matches(entry: LibraryEntry, query: string): boolean {
  return entry.label.toLowerCase().includes(query.toLowerCase());
}

function groupsFor(library: Library, category: LibraryCategory, query: string): LibraryGroup[] {
  const sections: readonly LibrarySection[] = ["streaming", "networks", "studios", "genres"];

  return sections
    .filter((section) => category === "all" || category === section)
    .map((section) => {
      return {
        section,
        label: sectionLabels[section],
        entries: library[section].filter((entry) => matches(entry, query)),
      };
    })
    .filter((group) => group.entries.length > 0);
}

export async function loadLibraryPage(
  category: LibraryCategory,
  query: string,
  requestedCountry: string | undefined,
): Promise<LibraryPageData> {
  await connection();

  let country = "";
  let countries: readonly WatchProviderRegion[] = [];

  try {
    const { seerr, regions } = await runAuthenticated(
      Effect.flatMap(SeerrClient, (client) =>
        Effect.all(
          {
            seerr: client.publicSettings(),
            regions: client.watchProviderRegions(),
          },
          { concurrency: "unbounded" },
        ),
      ),
    );
    countries = [...regions].sort((a, b) => a.english_name.localeCompare(b.english_name));
    const preferred = requestedCountry ?? (seerr.streamingRegion || seerr.discoverRegion);
    country =
      regions.find((item) => item.iso_3166_1 === preferred)?.iso_3166_1 ??
      regions.find((item) => item.iso_3166_1 === (seerr.streamingRegion || seerr.discoverRegion))
        ?.iso_3166_1 ??
      regions[0].iso_3166_1;
    const library = await loadLibrary(country);
    const groups = groupsFor(library, category, query);

    return {
      country,
      countries,
      groups,
      error: undefined,
    };
  } catch (error) {
    // Failures are logged where they happen (see `library.ts`); the page only needs a summary.
    return {
      country,
      countries,
      groups: [],
      error: `The Seerr catalogue could not be loaded${error instanceof Error && error.message ? `: ${error.message}` : "."}`,
    };
  }
}
