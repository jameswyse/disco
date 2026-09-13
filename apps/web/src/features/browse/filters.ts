import type { MediaType } from "@/integrations/seerr/client";

export type MediaFilter = "all" | MediaType;

/** Grid filters carried in the URL so every browse screen is shareable. */
export type BrowseFilters = Readonly<{
  mediaType: MediaFilter;
  genreId: number | undefined;
  /** ISO 639-1 original-language code. */
  language: string | undefined;
  ratingAtLeast: number | undefined;
  hideAvailable: boolean;
}>;

export type SearchParameter = string | string[] | undefined;
export type SearchParameters = Readonly<Record<string, SearchParameter>>;

export const ratingOptions = [6, 7, 8] as const;

export const noFilters: BrowseFilters = {
  mediaType: "all",
  genreId: undefined,
  language: undefined,
  ratingAtLeast: undefined,
  hideAvailable: false,
};

function first(value: SearchParameter): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined): number | undefined {
  const parsed = value === undefined ? Number.NaN : Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

const languagePattern = /^[a-z]{2}$/;

/** Value of `lang` that switches the language filter off despite a saved default. */
export const anyLanguage = "any";

function resolveLanguage(
  value: string | undefined,
  defaultLanguage: string | undefined,
): string | undefined {
  if (value === undefined) {
    return defaultLanguage;
  }

  if (value === anyLanguage) {
    return undefined;
  }

  return languagePattern.test(value) ? value : defaultLanguage;
}

export function parseBrowseFilters(
  query: SearchParameters,
  defaultLanguage: string | undefined,
): BrowseFilters {
  const mediaType = first(query.type);
  const rating = positiveInteger(first(query.rating));

  return {
    mediaType: mediaType === "movie" || mediaType === "tv" ? mediaType : "all",
    genreId: positiveInteger(first(query.genre)),
    language: resolveLanguage(first(query.lang), defaultLanguage),
    ratingAtLeast:
      rating !== undefined && ratingOptions.some((option) => option === rating)
        ? rating
        : undefined,
    hideAvailable: first(query.hide) === "1",
  };
}

/** Query-string entries for filters that differ from the defaults. */
export function filterEntries(
  filters: BrowseFilters,
  defaultLanguage: string | undefined,
): [string, string][] {
  const entries: [string, string][] = [];

  if (filters.mediaType !== "all") {
    entries.push(["type", filters.mediaType]);
  }

  if (filters.genreId !== undefined) {
    entries.push(["genre", String(filters.genreId)]);
  }

  if (filters.language !== defaultLanguage) {
    entries.push(["lang", filters.language ?? anyLanguage]);
  }

  if (filters.ratingAtLeast !== undefined) {
    entries.push(["rating", String(filters.ratingAtLeast)]);
  }

  if (filters.hideAvailable) {
    entries.push(["hide", "1"]);
  }

  return entries;
}

/** Whether any filter changes which titles Seerr returns (as opposed to hiding them locally). */
export function hasDiscoverFilters(filters: BrowseFilters): boolean {
  return (
    filters.genreId !== undefined ||
    filters.language !== undefined ||
    filters.ratingAtLeast !== undefined
  );
}
