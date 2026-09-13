import { connection } from "next/server";

import { Effect } from "effect";

import { titleFromResult } from "@/features/browse/title";
import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { appRuntime } from "@/platform/runtime";

import type { GenreNames, Title } from "@/features/browse/title";
import type { MediaResult, MovieResult, TvResult } from "@/integrations/seerr/schemas";

export type SearchResult =
  | Readonly<{
      kind: "ok";
      titles: readonly Title[];
      page: number;
      totalPages: number;
      totalResults: number;
    }>
  | Readonly<{ kind: "error"; message: string }>;

function isMedia(result: MediaResult): result is MovieResult | TvResult {
  return result.mediaType !== "person";
}

const searchProgram = (query: string, page: number) =>
  Effect.gen(function* () {
    const client = yield* SeerrClient;
    const [results, movieGenres, tvGenres] = yield* Effect.all(
      [client.search(query, page), client.genres("movie"), client.genres("tv")],
      { concurrency: "unbounded" },
    );
    const genreNames: GenreNames = new Map(
      [...movieGenres, ...tvGenres].map((genre) => [genre.id, genre.name]),
    );

    return {
      kind: "ok",
      titles: results.results.filter(isMedia).map((result) => titleFromResult(result, genreNames)),
      page: results.page,
      totalPages: results.totalPages,
      totalResults: results.totalResults,
    } satisfies SearchResult;
  });

export async function loadSearch(query: string, page: number): Promise<SearchResult> {
  await connection();

  return appRuntime.runPromise(
    searchProgram(query, page).pipe(
      Effect.tapError((error) => Effect.logError("Seerr search request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<SearchResult>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
