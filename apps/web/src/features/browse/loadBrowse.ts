import { connection } from "next/server";

import { Effect } from "effect";

import { titleFromResult } from "@/features/title/title";
import { viewMediaTypes } from "@/features/views/views";
import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

import { browseBatchSize, collectBrowseBatch, tmdbPageLimit } from "./browseBatch";
import { planBrowseSources } from "./browsePlan";

import type { GenreNames, Title } from "@/features/title/title";
import type { View } from "@/features/views/views";
import type { SeerrError } from "@/integrations/seerr/errors";
import type { SeerrIdentity } from "@/integrations/seerr/identity";
import type { Genre, MediaResult, MovieResult, TvResult } from "@/integrations/seerr/schemas";

import type { BrowseChunk, BrowseCursor } from "./browseBatch";
import type { BrowseSource } from "./browsePlan";
import type { DiscoverListId } from "./discoverLists";
import type { BrowseFilters } from "./filters";

const resultsPerSeerrPage = 20;
const maxSeerrPagesPerBatch = 12;

export type BrowseResult =
  | Readonly<{
      kind: "ok";
      titles: readonly Title[];
      hiddenAvailable: number;
      hiddenRequested: number;
      next: BrowseCursor | undefined;
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

type SourceRound = readonly (readonly SourcePage[])[];
type LoadedChunk = BrowseChunk & Readonly<{ totalResults: number }>;

function isMedia(result: MediaResult): result is MovieResult | TvResult {
  return result.mediaType !== "person";
}

function fetchSourcePage(
  client: typeof SeerrClient.Service,
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

function fetchRound(
  client: typeof SeerrClient.Service,
  sources: readonly BrowseSource[],
  firstPage: number,
  lastPage: number,
): Effect.Effect<SourceRound, SeerrError, SeerrIdentity> {
  const pagesToFillBatch = Math.ceil(browseBatchSize / (resultsPerSeerrPage * sources.length)) + 1;

  const pages = Array.from(
    { length: Math.min(pagesToFillBatch, lastPage - firstPage + 1) },
    (_, offset) => firstPage + offset,
  );

  return Effect.all(
    pages.map((page) =>
      Effect.all(
        sources.map((source) => fetchSourcePage(client, source, page)),
        { concurrency: "unbounded" },
      ),
    ),
    { concurrency: "unbounded" },
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

function browseChunks(
  round: SourceRound,
  firstPage: number,
  genreNames: GenreNames,
): LoadedChunk[] {
  return round.map((sourcePages, offset) => ({
    page: firstPage + offset,
    lastPage: Math.min(tmdbPageLimit, Math.max(...sourcePages.map((source) => source.totalPages))),
    totalResults: sourcePages.reduce((sum, source) => sum + source.totalResults, 0),
    titles: combineSources(sourcePages, genreNames),
  }));
}

function browseProgram(
  view: View,
  list: DiscoverListId,
  filters: BrowseFilters,
  cursor: BrowseCursor,
): Effect.Effect<BrowseResult, SeerrError, SeerrClient | SeerrIdentity> {
  return Effect.gen(function* () {
    const client = yield* SeerrClient;
    const settings = yield* client.publicSettings();
    const region = settings.streamingRegion || settings.discoverRegion || "US";
    const today = new Date().toISOString().slice(0, 10);
    const sources = planBrowseSources(view, list, filters, { today, region });
    const lastBudgetPage = Math.min(tmdbPageLimit, cursor.page + maxSeerrPagesPerBatch - 1);

    const [movieGenres, tvGenres, firstRound] = yield* Effect.all(
      [
        client.genres("movie"),
        client.genres("tv"),
        fetchRound(client, sources, cursor.page, lastBudgetPage),
      ],
      { concurrency: "unbounded" },
    );

    const genreNames: GenreNames = new Map(
      [...movieGenres, ...tvGenres].map((genre) => [genre.id, genre.name]),
    );

    const chunks = browseChunks(firstRound, cursor.page, genreNames);
    let batch = collectBrowseBatch(chunks, cursor, filters);

    while (!batch.full && batch.next !== undefined && batch.next.page <= lastBudgetPage) {
      const firstPage = batch.next.page;
      const lastPage = Math.min(lastBudgetPage, Math.max(...chunks.map((chunk) => chunk.lastPage)));
      const round = yield* fetchRound(client, sources, firstPage, lastPage);
      chunks.push(...browseChunks(round, firstPage, genreNames));
      batch = collectBrowseBatch(chunks, cursor, filters);
    }

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
      titles: batch.titles,
      hiddenAvailable: batch.hiddenAvailable,
      hiddenRequested: batch.hiddenRequested,
      next: batch.next,
      totalResults: Math.max(0, ...chunks.map((chunk) => chunk.totalResults)),
      genres: [...genresById.values()].toSorted((a, b) => a.name.localeCompare(b.name)),
      region,
      seerrOrigin: client.origin.origin,
    };
  });
}

export async function loadBrowse(
  view: View,
  list: DiscoverListId,
  filters: BrowseFilters,
  cursor: BrowseCursor,
): Promise<BrowseResult> {
  await connection();

  return runAuthenticated(
    browseProgram(view, list, filters, cursor).pipe(
      Effect.tapError((error) => Effect.logError("Seerr browse request failed", error)),
      Effect.catch((error) =>
        Effect.succeed<BrowseResult>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
