import type { MediaType } from "@/integrations/seerr/client";
import type { MovieResult, TvResult } from "@/integrations/seerr/schemas";

export const availabilityValues = [
  "not-in-library",
  "blocklisted",
  "pending",
  "processing",
  "partially-available",
  "available",
  "up-to-date",
  "some-available",
  "not-yet-aired",
] as const;
export type Availability = (typeof availabilityValues)[number];

export const availabilityLabels = {
  "not-in-library": "Not Available",
  blocklisted: "Blocklisted",
  pending: "Pending approval",
  processing: "Requested",
  "partially-available": "Partly Available",
  available: "Available",
  "up-to-date": "Up to date",
  "some-available": "Some episodes available",
  "not-yet-aired": "Not yet aired",
} satisfies Record<Availability, string>;

export function isInLibrary(availability: Availability): boolean {
  return (
    availability === "available" ||
    availability === "up-to-date" ||
    availability === "partially-available" ||
    availability === "some-available"
  );
}

/** A movie or series shown on a title card. Plain data so it can cross the RSC boundary. */
export type Title = Readonly<{
  id: number;
  mediaType: MediaType;
  name: string;
  year: number | undefined;
  rating: number | undefined;
  voteCount: number;
  popularity: number;
  overview: string;
  posterPath: string | undefined;
  backdropPath: string | undefined;
  genres: readonly string[];
  availability: Availability;
  availabilityDetail?: string | undefined;
  airing?: string | undefined;
  /** Filled in from the details endpoints by `withTitleFacts`; list results omit them. */
  runtimeMinutes: number | undefined;
  seasonCount: number | undefined;
}>;

export type GenreNames = ReadonlyMap<number, string>;

/** Averages over fewer votes than this say nothing useful, so the card omits them. */
const minimumVotesForRating = 10;

/** Seerr `MediaInfo.status`: 1 unknown, 2 pending, 3 processing, 4 partial, 5 available, 6 blocklisted, 7 deleted. */
const availabilityByStatus: ReadonlyMap<number, Availability> = new Map([
  [2, "pending"],
  [3, "processing"],
  [4, "partially-available"],
  [5, "available"],
  [6, "blocklisted"],
]);

export function availabilityFromStatus(status: number | undefined): Availability {
  return (status === undefined ? undefined : availabilityByStatus.get(status)) ?? "not-in-library";
}

function text(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}

function yearOf(date: string | null | undefined): number | undefined {
  const year = date ? Number(date.slice(0, 4)) : Number.NaN;

  return Number.isInteger(year) ? year : undefined;
}

export function titleFromResult(result: MovieResult | TvResult, genreNames: GenreNames): Title {
  const voteCount = result.voteCount ?? 0;
  const shared = {
    id: result.id,
    rating:
      result.voteAverage && voteCount >= minimumVotesForRating
        ? Math.round(result.voteAverage * 10) / 10
        : undefined,
    voteCount,
    popularity: result.popularity ?? 0,
    overview: result.overview ?? "",
    posterPath: text(result.posterPath),
    backdropPath: text(result.backdropPath),
    genres: (result.genreIds ?? []).flatMap((id) => {
      const name = genreNames.get(id);

      return name === undefined ? [] : [name];
    }),
    availability: availabilityFromStatus(result.mediaInfo?.status),
    runtimeMinutes: undefined,
    seasonCount: undefined,
  };

  return result.mediaType === "movie"
    ? { ...shared, mediaType: "movie", name: result.title, year: yearOf(result.releaseDate) }
    : {
        ...shared,
        mediaType: "tv",
        name: result.name,
        year: yearOf(result.firstAirDate),
        availability:
          shared.availability === "partially-available" ? "some-available" : shared.availability,
      };
}
