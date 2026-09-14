import { connection } from "next/server";

import { Effect } from "effect";

import { titleFromResult } from "@/features/title/title";
import { viewMediaTypes } from "@/features/views/views";
import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

import { planBrowseSources } from "./browsePlan";

import type { GenreNames, Title } from "@/features/title/title";
import type { View } from "@/features/views/views";
import type { SeerrError } from "@/integrations/seerr/errors";
import type { SeerrIdentity } from "@/integrations/seerr/identity";
import type { Genre, MediaResult, MovieResult, TvResult } from "@/integrations/seerr/schemas";

import type { BrowseSource } from "./browsePlan";
import type { DiscoverListId } from "./discoverLists";
import type { BrowseFilters } from "./filters";

/** Seerr returns 20 results per page; a browse page shows two of them. */
const seerrPagesPerBrowsePage = 2;

export type BrowseResult =
  | Readonly<{
      kind: "ok";
      titles: readonly Title[];
      /** Titles removed by the "Hide already available" filter. */
      hiddenAvailable: number;
      page: number;
      totalPages: number;
      totalResults: number;
      genres: readonly Genre[];
      region: string;
      seerrOrigin: string;
    }>
  | Readonly<{ kind: "error"; message: string }>;

type SourcePage = Readonly<{
  results: readonly MediaResult[];
  totalPages: number;
  totalResults: number;
}>;

function isMedia(result: MediaResult): result is MovieResult | TvResult {
  return result.mediaType !== "person";
}

function fetchSourcePage(
  client: SeerrClient,
  source: BrowseSource,
  page: number,
): Effect.Effect<SourcePage, SeerrError, SeerrIdentity> {
  switch (source.kind) {
    case "trending":
      return client.trending({ page, mediaType: source.mediaType });
    case "upcoming":
      return source.mediaType === "movie" ? client.upcomingMovies(page) : client.upcomingTv(page);
    case "discover":
      return source.mediaType === "movie"
        ? client.discoverMovies({ ...source.query, page })
        : client.discoverTv({ ...source.query, page });

    default: {
      const unsupportedSource: never = source;

      return unsupportedSource;
    }
  }
}

function fetchSource(
  client: SeerrClient,
  source: BrowseSource,
  browsePage: number,
): Effect.Effect<SourcePage, SeerrError, SeerrIdentity> {
  const firstSeerrPage = (browsePage - 1) * seerrPagesPerBrowsePage + 1;
  const seerrPages = Array.from(
    { length: seerrPagesPerBrowsePage },
    (_, offset) => firstSeerrPage + offset,
  );

  return Effect.all(
    seerrPages.map((page) => fetchSourcePage(client, source, page)),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((pages) => ({
      results: pages.flatMap((page) => page.results),
      totalPages: Math.ceil(
        Math.max(...pages.map((page) => page.totalPages)) / seerrPagesPerBrowsePage,
      ),
      totalResults: Math.max(...pages.map((page) => page.totalResults)),
    })),
  );
}

function dedupe(titles: readonly Title[]): Title[] {
  const seen = new Set<string>();

  return titles.filter((title) => {
    const key = `${title.mediaType}:${title.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

/**
 * Alternate between sources so movies and series mix while each keeps Seerr's ordering. TMDB
 * popularity scores are not comparable across media types, so sorting by them would not work.
 */
function interleave(lists: readonly (readonly Title[])[]): Title[] {
  const longest = Math.max(0, ...lists.map((list) => list.length));

  return Array.from({ length: longest }, (_, index) =>
    lists.flatMap((list) => {
      const title = list[index];

      return title === undefined ? [] : [title];
    }),
  ).flat();
}

export function combineSources(pages: readonly SourcePage[], genreNames: GenreNames): Title[] {
  const titlesBySource = pages.map((page) =>
    page.results.filter(isMedia).map((result) => titleFromResult(result, genreNames)),
  );

  return dedupe(interleave(titlesBySource));
}

function isInLibrary(title: Title): boolean {
  return title.availability === "available" || title.availability === "partially-available";
}

function browseProgram(
  view: View,
  list: DiscoverListId,
  filters: BrowseFilters,
  page: number,
): Effect.Effect<BrowseResult, SeerrError, SeerrClient | SeerrIdentity> {
  return Effect.gen(function* () {
    const client = yield* SeerrClient;
    const settings = yield* client.publicSettings();
    const region = settings.streamingRegion || settings.discoverRegion || "US";
    const today = new Date().toISOString().slice(0, 10);
    const sources = planBrowseSources(view, list, filters, { today, region });
    const [movieGenres, tvGenres, sourcePages] = yield* Effect.all(
      [
        client.genres("movie"),
        client.genres("tv"),
        Effect.all(
          sources.map((source) => fetchSource(client, source, page)),
          { concurrency: "unbounded" },
        ),
      ],
      { concurrency: "unbounded" },
    );
    const genreNames: GenreNames = new Map(
      [...movieGenres, ...tvGenres].map((genre) => [genre.id, genre.name]),
    );
    const allTitles = combineSources(sourcePages, genreNames);
    const titles = filters.hideAvailable
      ? allTitles.filter((title) => !isInLibrary(title))
      : allTitles;
    const mediaTypes = viewMediaTypes(view).filter(
      (type) => filters.mediaType === "all" || filters.mediaType === type,
    );
    const applicableGenres = [
      ...(mediaTypes.includes("movie") ? movieGenres : []),
      ...(mediaTypes.includes("tv") ? tvGenres : []),
    ];
    const genresById = new Map(applicableGenres.map((genre) => [genre.id, genre] as const));

    return {
      kind: "ok",
      titles,
      hiddenAvailable: allTitles.length - titles.length,
      page,
      totalPages: Math.max(0, ...sourcePages.map((source) => source.totalPages)),
      totalResults: sourcePages.reduce((sum, source) => sum + source.totalResults, 0),
      genres: [...genresById.values()].sort((a, b) => a.name.localeCompare(b.name)),
      region,
      seerrOrigin: client.origin.origin,
    };
  });
}

export async function loadBrowse(
  view: View,
  list: DiscoverListId,
  filters: BrowseFilters,
  page: number,
): Promise<BrowseResult> {
  // Seerr data is request-time; opting in explicitly keeps the Effect runtime's clock access out
  // of the static prerender.
  await connection();

  return runAuthenticated(
    browseProgram(view, list, filters, page).pipe(
      Effect.tapError((error) => Effect.logError("Seerr browse request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<BrowseResult>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
