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
  hideRequested: boolean;
  year?: number | undefined;
  sort?: "popular" | "rating" | "newest" | "oldest" | undefined;
  votesAtLeast?: number | undefined;
}>;

export type SearchParameter = string | string[] | undefined;
export type SearchParameters = Readonly<Record<string, SearchParameter>>;

export const ratingOptions = [5, 6, 7, 8, 9] as const;

export const defaultFilters: BrowseFilters = {
  mediaType: "all",
  genreId: undefined,
  language: undefined,
  ratingAtLeast: undefined,
  hideAvailable: true,
  hideRequested: true,
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

export const sortOptions = [
  { id: "popular", label: "Most popular" },
  { id: "rating", label: "Highest rated" },
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
] as const;
export const voteOptions = [100, 500, 1000, 5000] as const;

function parseYear(value: string | undefined): number | undefined {
  const year = positiveInteger(value);

  return year !== undefined && year >= 1870 && year <= 2100 ? year : undefined;
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
    hideAvailable: first(query.hide) !== "0",
    hideRequested: first(query.hideRequested) !== "0",
    year: parseYear(first(query.year)),
    sort: sortOptions.find((option) => option.id === first(query.sort))?.id,
    votesAtLeast: voteOptions.find((option) => option === positiveInteger(first(query.votes))),
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

  if (!filters.hideAvailable) {
    entries.push(["hide", "0"]);
  }

  if (!filters.hideRequested) {
    entries.push(["hideRequested", "0"]);
  }

  if (filters.year !== undefined) {
    entries.push(["year", String(filters.year)]);
  }

  if (filters.sort !== undefined) {
    entries.push(["sort", filters.sort]);
  }

  if (filters.votesAtLeast !== undefined) {
    entries.push(["votes", String(filters.votesAtLeast)]);
  }

  return entries;
}

/** Whether any filter changes which titles Seerr returns (as opposed to hiding them locally). */
export function hasDiscoverFilters(filters: BrowseFilters): boolean {
  return (
    filters.genreId !== undefined ||
    filters.language !== undefined ||
    filters.ratingAtLeast !== undefined ||
    filters.year !== undefined ||
    filters.sort !== undefined ||
    filters.votesAtLeast !== undefined
  );
}
