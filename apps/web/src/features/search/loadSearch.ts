import { connection } from "next/server";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

import { searchItem } from "./searchResult";

import type { GenreNames } from "@/features/title/title";

import type { SearchItem } from "./searchResult";

export type SearchResult =
  | Readonly<{
      kind: "ok";
      items: readonly SearchItem[];
      page: number;
      totalPages: number;
      totalResults: number;
    }>
  | Readonly<{ kind: "error"; message: string }>;

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
      items: results.results.map((result) => searchItem(result, genreNames)),
      page: results.page,
      totalPages: results.totalPages,
      totalResults: results.totalResults,
    } satisfies SearchResult;
  });

export async function loadSearch(query: string, page: number): Promise<SearchResult> {
  await connection();

  return runAuthenticated(
    searchProgram(query, page).pipe(
      Effect.tapError((error) => Effect.logError("Seerr search request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<SearchResult>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
