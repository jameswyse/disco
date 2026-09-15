import { availabilityFromStatus } from "./title";
import { tvAvailability } from "./tvAvailability";

import type { MediaType } from "@/integrations/seerr/client";
import type {
  CombinedRatings,
  DownloadStatus,
  ImdbRating,
  MediaInfo,
  MovieDetails,
  RottenTomatoesRating,
  TvDetails,
  WatchProvider,
} from "@/integrations/seerr/schemas";

import type { Availability } from "./title";

export type Person = Readonly<{
  id: number;
  name: string;
  role: string | undefined;
  profilePath: string | undefined;
}>;

export type Scores = Readonly<{
  tmdb: Readonly<{ score: number; votes: number }> | undefined;
  rottenTomatoes:
    | Readonly<{
        critics: number | undefined;
        audience: number | undefined;
        url: string | undefined;
      }>
    | undefined;
  imdb: Readonly<{ score: number; votes: number | undefined; url: string | undefined }> | undefined;
}>;

/** Seerr request status: 1 pending approval, 2 approved, 3 declined, 4 failed, 5 completed. */
export type RequestSummary = Readonly<{
  id: number;
  status: "pending" | "approved" | "declined" | "failed" | "completed";
  requestedBy: string | undefined;
  requestedAt: string;
  seasons: readonly number[];
  qualityProfile?: string | undefined;
  profileId?: number | undefined;
  serverId?: number | undefined;
}>;

export type Download = Readonly<{
  title: string;
  /** 0–1, or undefined when Seerr reports no size. */
  progress: number | undefined;
  timeLeft: string | undefined;
}>;

export type SeasonSummary = Readonly<{
  number: number;
  name: string;
  episodeCount: number;
  airDate: string | undefined;
  airDateLabel?: string | undefined;
  availabilityDetail?: string | undefined;
  availability: Availability;
}>;

export type ExternalLink = Readonly<{ label: string; url: string }>;

/**
 * Whether the title exists somewhere a download client could find it. Films count once a digital
 * or physical release date has passed (matching Radarr's "released" availability); series once
 * their first episode has aired.
 */
export type Release = Readonly<{
  /** Cinema or first-air date. */
  premiere: string | undefined;
  /** Earliest digital or physical release date across regions (films only). */
  home: string | undefined;
  released: boolean;
}>;

/** Everything the details screen and hover preview show for one movie or series. */
export type TitleDetails = Readonly<{
  id: number;
  mediaType: MediaType;
  name: string;
  year: number | undefined;
  tagline: string | undefined;
  overview: string;
  posterPath: string | undefined;
  backdropPath: string | undefined;
  genres: readonly string[];
  originalLanguage: string | undefined;
  countries: readonly string[];
  status: string | undefined;
  /** Film runtime or typical episode runtime, in minutes. */
  runtimeMinutes: number | undefined;
  episodeCount: number | undefined;
  seasonCount: number | undefined;
  seriesType: string | undefined;
  certification: string | undefined;
  release: Release;
  scores: Scores;
  cast: readonly Person[];
  creators: readonly string[];
  directors: readonly string[];
  companies: readonly string[];
  networks: readonly Readonly<{ name: string; logoPath: string | undefined }>[];
  keywords: readonly string[];
  trailerEmbedUrl: string | undefined;
  streamingOn: readonly WatchProvider[];
  availability: Availability;
  availabilityDetail?: string | undefined;
  airing?: string | undefined;
  plexUrl: string | undefined;
  requests: readonly RequestSummary[];
  downloads: readonly Download[];
  seasons: readonly SeasonSummary[];
  onWatchlist: boolean;
  externalLinks: readonly ExternalLink[];
}>;

const requestStatuses = new Map<number, RequestSummary["status"]>([
  [1, "pending"],
  [2, "approved"],
  [3, "declined"],
  [4, "failed"],
  [5, "completed"],
]);

function text(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}

function yearOf(date: string | null | undefined): number | undefined {
  const year = date ? Number(date.slice(0, 4)) : Number.NaN;

  return Number.isInteger(year) ? year : undefined;
}

function requestSummaries(mediaInfo: MediaInfo | null | undefined): RequestSummary[] {
  return (mediaInfo?.requests ?? []).map((request) => ({
    id: request.id,
    status: requestStatuses.get(request.status) ?? "pending",
    requestedBy: request.requestedBy?.displayName,
    requestedAt: request.createdAt,
    seasons: (request.seasons ?? []).map((season) => season.seasonNumber),
    qualityProfile: request.profileName ?? undefined,
    profileId: request.profileId ?? undefined,
    serverId: request.serverId ?? undefined,
  }));
}

function downloads(mediaInfo: MediaInfo | null | undefined): Download[] {
  return (mediaInfo?.downloadStatus ?? []).map((download: DownloadStatus) => ({
    title: download.title ?? "Download",
    progress:
      download.size && download.sizeLeft !== null && download.sizeLeft !== undefined
        ? Math.min(1, Math.max(0, 1 - download.sizeLeft / download.size))
        : undefined,
    timeLeft: text(download.timeLeft),
  }));
}

function scores(
  details: MovieDetails | TvDetails,
  rt: RottenTomatoesRating | null | undefined,
  imdb: ImdbRating | null | undefined,
): Scores {
  return {
    tmdb:
      details.voteAverage && details.voteCount
        ? { score: Math.round(details.voteAverage * 10) / 10, votes: details.voteCount }
        : undefined,
    rottenTomatoes: rt
      ? {
          critics: rt.criticsScore ?? undefined,
          audience: rt.audienceScore ?? undefined,
          url: text(rt.url),
        }
      : undefined,
    imdb: imdb?.criticsScore
      ? {
          score: imdb.criticsScore,
          votes: imdb.criticsScoreCount ?? undefined,
          url: text(imdb.url),
        }
      : undefined,
  };
}

function streamingOn(details: MovieDetails | TvDetails, region: string): readonly WatchProvider[] {
  const regional = details.watchProviders?.find((entry) => entry.iso_3166_1 === region);

  return regional?.flatrate ?? [];
}

const youtubeVideoId = /^[\w-]+$/;

function trailerEmbedUrl(details: MovieDetails | TvDetails): string | undefined {
  const trailer =
    details.relatedVideos?.find((video) => video.type === "Trailer" && video.site === "YouTube") ??
    details.relatedVideos?.find((video) => video.site === "YouTube");

  let videoId = text(trailer?.key);

  if (!videoId && trailer?.url) {
    const url = URL.parse(trailer.url);

    if (url?.hostname === "youtu.be") {
      videoId = url.pathname.slice(1);
    } else if (url?.hostname === "www.youtube.com" || url?.hostname === "youtube.com") {
      videoId = url.pathname.startsWith("/embed/")
        ? url.pathname.slice("/embed/".length)
        : (url.searchParams.get("v") ?? undefined);
    }
  }

  return videoId && youtubeVideoId.test(videoId)
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=0&fs=1&rel=0`
    : undefined;
}

function sharedDetails(details: MovieDetails | TvDetails, region: string) {
  const crew = details.credits?.crew ?? [];

  return {
    id: details.id,
    tagline: text(details.tagline),
    overview: details.overview ?? "",
    posterPath: text(details.posterPath),
    backdropPath: text(details.backdropPath),
    genres: (details.genres ?? []).map((genre) => genre.name),
    originalLanguage:
      text(
        details.spokenLanguages?.find((language) => language.iso_639_1 === details.originalLanguage)
          ?.englishName,
      ) ??
      text(
        details.spokenLanguages?.find((language) => language.iso_639_1 === details.originalLanguage)
          ?.english_name,
      ) ??
      text(details.originalLanguage),
    countries: (details.productionCountries ?? []).map((country) => country.name),
    status: text(details.status),
    cast: (details.credits?.cast ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .slice(0, 14)
      .map((member) => ({
        id: member.id,
        name: member.name,
        role: text(member.character),
        profilePath: text(member.profilePath),
      })),
    directors: crew.filter((member) => member.job === "Director").map((member) => member.name),
    companies: (details.productionCompanies ?? []).map((company) => company.name),
    keywords: (details.keywords ?? []).map((keyword) => keyword.name),
    trailerEmbedUrl: trailerEmbedUrl(details),
    streamingOn: streamingOn(details, region),
    availability: availabilityFromStatus(details.mediaInfo?.status),
    plexUrl: text(details.mediaInfo?.mediaUrl),
    requests: requestSummaries(details.mediaInfo),
    downloads: downloads(details.mediaInfo),
    onWatchlist: details.onUserWatchlist ?? false,
  };
}

/** TMDB release types: 1 premiere, 2 limited theatrical, 3 theatrical, 4 digital, 5 physical, 6 TV. */
const homeReleaseTypes = new Set([4, 5]);

function isoDate(value: string | null | undefined): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function movieRelease(details: MovieDetails, today: string): Release {
  const homeDates = (details.releases?.results ?? [])
    .flatMap((entry) => entry.release_dates)
    .filter(
      (date) => date.type !== null && date.type !== undefined && homeReleaseTypes.has(date.type),
    )
    .flatMap((date) => {
      const iso = isoDate(date.release_date);

      return iso === undefined ? [] : [iso];
    })
    .sort();
  const home = homeDates[0];

  return {
    premiere: isoDate(details.releaseDate),
    home,
    released: home !== undefined && home <= today,
  };
}

function tvRelease(details: TvDetails, today: string): Release {
  const premiere = isoDate(details.firstAirDate);

  return { premiere, home: undefined, released: premiere !== undefined && premiere <= today };
}

function movieCertification(details: MovieDetails, region: string): string | undefined {
  const release = details.releases?.results.find((entry) => entry.iso_3166_1 === region);

  return text(release?.release_dates.find((date) => date.certification)?.certification);
}

export function titleDetailsFromMovie(
  details: MovieDetails,
  ratings: CombinedRatings | undefined,
  region: string,
  today: string,
): TitleDetails {
  const imdbId = text(details.imdbId) ?? text(details.externalIds?.imdbId);

  return {
    ...sharedDetails(details, region),
    mediaType: "movie",
    name: details.title,
    year: yearOf(details.releaseDate),
    runtimeMinutes: details.runtime ?? undefined,
    episodeCount: undefined,
    seasonCount: undefined,
    seriesType: undefined,
    certification: movieCertification(details, region),
    release: movieRelease(details, today),
    scores: scores(details, ratings?.rt, ratings?.imdb),
    creators: [],
    networks: [],
    seasons: [],
    externalLinks: [
      { label: "TMDB", url: `https://www.themoviedb.org/movie/${details.id}` },
      ...(imdbId ? [{ label: "IMDb", url: `https://www.imdb.com/title/${imdbId}` }] : []),
      { label: "Trakt", url: `https://trakt.tv/search/tmdb/${details.id}?id_type=movie` },
      { label: "Letterboxd", url: `https://letterboxd.com/tmdb/${details.id}` },
    ],
  };
}

export function titleDetailsFromTv(
  details: TvDetails,
  ratings: RottenTomatoesRating | undefined,
  region: string,
  today: string,
): TitleDetails {
  const imdbId = text(details.externalIds?.imdbId);
  const tvdbId = details.externalIds?.tvdbId ?? undefined;

  return {
    ...sharedDetails(details, region),
    ...tvAvailability(details, today),
    mediaType: "tv",
    name: details.name,
    year: yearOf(details.firstAirDate),
    runtimeMinutes: details.episodeRunTime?.[0],
    episodeCount: details.numberOfEpisodes ?? undefined,
    seasonCount: details.numberOfSeasons ?? undefined,
    seriesType: text(details.type),
    certification: text(
      details.contentRatings?.results.find((entry) => entry.iso_3166_1 === region)?.rating,
    ),
    release: tvRelease(details, today),
    scores: scores(details, ratings, undefined),
    creators: (details.createdBy ?? []).map((creator) => creator.name),
    networks: (details.networks ?? []).map((network) => ({
      name: network.name,
      logoPath: text(network.logoPath),
    })),
    externalLinks: [
      { label: "TMDB", url: `https://www.themoviedb.org/tv/${details.id}` },
      ...(imdbId ? [{ label: "IMDb", url: `https://www.imdb.com/title/${imdbId}` }] : []),
      ...(tvdbId
        ? [{ label: "TVDB", url: `https://www.thetvdb.com/dereferrer/series/${tvdbId}` }]
        : []),
      { label: "Trakt", url: `https://trakt.tv/search/tmdb/${details.id}?id_type=show` },
    ],
  };
}
