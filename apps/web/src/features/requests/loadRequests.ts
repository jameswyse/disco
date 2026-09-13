import { connection } from "next/server";

import { Effect } from "effect";

import { availabilityFromStatus } from "@/features/browse/title";
import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { appRuntime } from "@/platform/runtime";

import type { Availability } from "@/features/browse/title";
import type { MediaType, RequestListQuery } from "@/integrations/seerr/client";

export type RequestFilter = RequestListQuery["filter"];

export const requestFilters: readonly Readonly<{ id: RequestFilter; label: string }>[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending approval" },
  { id: "processing", label: "Processing" },
  { id: "available", label: "Available" },
];

export function parseRequestFilter(value: string | string[] | undefined): RequestFilter {
  const candidate = Array.isArray(value) ? value[0] : value;

  return requestFilters.find((filter) => filter.id === candidate)?.id ?? "all";
}

export type RequestRow = Readonly<{
  id: number;
  mediaType: MediaType;
  tmdbId: number;
  name: string;
  year: number | undefined;
  posterPath: string | undefined;
  requestedBy: string | undefined;
  requestedAt: string;
  status: "pending" | "approved" | "declined" | "failed" | "completed";
  availability: Availability;
  seasons: readonly number[];
}>;

export type RequestsResult =
  | Readonly<{ kind: "ok"; rows: readonly RequestRow[]; page: number; totalPages: number }>
  | Readonly<{ kind: "error"; message: string }>;

const pageSize = 20;

const requestStatuses = new Map<number, RequestRow["status"]>([
  [1, "pending"],
  [2, "approved"],
  [3, "declined"],
  [4, "failed"],
  [5, "completed"],
]);

function yearOf(date: string | null | undefined): number | undefined {
  const year = date ? Number(date.slice(0, 4)) : Number.NaN;

  return Number.isInteger(year) ? year : undefined;
}

const requestsProgram = (filter: RequestFilter, page: number) =>
  Effect.gen(function* () {
    const client = yield* SeerrClient;
    const list = yield* client.requests({ take: pageSize, skip: (page - 1) * pageSize, filter });
    const rows = yield* Effect.all(
      list.results.map((request) =>
        (request.media.mediaType === "movie"
          ? client.movie(request.media.tmdbId).pipe(
              Effect.map((movie) => ({
                name: movie.title,
                year: yearOf(movie.releaseDate),
                posterPath: movie.posterPath ?? undefined,
              })),
            )
          : client.tv(request.media.tmdbId).pipe(
              Effect.map((tv) => ({
                name: tv.name,
                year: yearOf(tv.firstAirDate),
                posterPath: tv.posterPath ?? undefined,
              })),
            )
        ).pipe(
          // A title Seerr can no longer resolve should not hide the rest of the list.
          Effect.catchAll(() =>
            Effect.succeed({
              name: `${request.media.mediaType === "movie" ? "Film" : "Series"} #${request.media.tmdbId}`,
              year: undefined,
              posterPath: undefined,
            }),
          ),
          Effect.map((title): RequestRow => ({
            id: request.id,
            mediaType: request.media.mediaType,
            tmdbId: request.media.tmdbId,
            ...title,
            requestedBy: request.requestedBy?.displayName,
            requestedAt: request.createdAt,
            status: requestStatuses.get(request.status) ?? "pending",
            availability: availabilityFromStatus(request.media.status),
            seasons: (request.seasons ?? []).map((season) => season.seasonNumber),
          })),
        ),
      ),
      { concurrency: 6 },
    );

    return {
      kind: "ok",
      rows,
      page: list.pageInfo.page,
      totalPages: list.pageInfo.pages,
    } satisfies RequestsResult;
  });

export async function loadRequests(filter: RequestFilter, page: number): Promise<RequestsResult> {
  await connection();

  return appRuntime.runPromise(
    requestsProgram(filter, page).pipe(
      Effect.tapError((error) => Effect.logError("Seerr requests list failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<RequestsResult>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
