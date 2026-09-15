import { connection } from "next/server";

import { Effect } from "effect";

import { requestedProfileName } from "@/features/title/qualityProfiles";
import { availabilityFromStatus } from "@/features/title/title";
import { tvAvailabilityProgram } from "@/features/title/tvAvailability";
import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { runAuthenticated } from "@/platform/auth/session";

import type { Availability } from "@/features/title/title";
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
  qualityProfile: string | undefined;
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
    const today = new Date().toISOString().slice(0, 10);
    const list = yield* client.requests({ take: pageSize, skip: (page - 1) * pageSize, filter });
    const rows = yield* Effect.all(
      list.results.map((request) =>
        (request.media.mediaType === "movie"
          ? client.movie(request.media.tmdbId).pipe(
              Effect.map((movie) => ({
                availability: availabilityFromStatus(request.media.status),
                name: movie.title,
                year: yearOf(movie.releaseDate),
                posterPath: movie.posterPath ?? undefined,
              })),
            )
          : client.tv(request.media.tmdbId).pipe(
              Effect.flatMap((tv) =>
                tvAvailabilityProgram(tv, today).pipe(
                  Effect.map(({ availability }) => ({
                    name: tv.name,
                    year: yearOf(tv.firstAirDate),
                    posterPath: tv.posterPath ?? undefined,
                    availability,
                  })),
                ),
              ),
            )
        ).pipe(
          // A title Seerr can no longer resolve should not hide the rest of the list.
          Effect.catchAll(() =>
            Effect.succeed({
              name: `${request.media.mediaType === "movie" ? "Film" : "Series"} #${request.media.tmdbId}`,
              year: undefined,
              posterPath: undefined,
              availability:
                request.type === "tv" && request.media.status === 4
                  ? ("some-available" as const)
                  : availabilityFromStatus(request.media.status),
            }),
          ),
          Effect.flatMap((title) =>
            requestedProfileName(request.type, request).pipe(
              Effect.map((qualityProfile): RequestRow => ({
                id: request.id,
                mediaType: request.media.mediaType,
                tmdbId: request.media.tmdbId,
                ...title,
                requestedBy: request.requestedBy?.displayName,
                requestedAt: request.createdAt,
                status: requestStatuses.get(request.status) ?? "pending",
                seasons: (request.seasons ?? []).map((season) => season.seasonNumber),
                qualityProfile,
              })),
            ),
          ),
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

  return runAuthenticated(
    requestsProgram(filter, page).pipe(
      Effect.tapError((error) => Effect.logError("Seerr requests list failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<RequestsResult>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
