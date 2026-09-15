import { Effect } from "effect";

import { PlexLibrary } from "@/integrations/plex/library";
import { SeerrClient } from "@/integrations/seerr/client";

import { availabilityFromStatus, isInLibrary } from "./title";

import type { SeasonDetails, TvDetails } from "@/integrations/seerr/schemas";

import type { Availability } from "./title";
import type { SeasonSummary } from "./titleDetails";

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Seerr's partial flag counts unaired episodes too. Only dated episode metadata can prove a gap. */
export function tvAvailability(
  tv: TvDetails,
  today: string,
  episodesBySeason: ReadonlyMap<number, SeasonDetails> = new Map(),
  libraryEpisodes?: ReadonlySet<string>,
) {
  const raw = availabilityFromStatus(tv.mediaInfo?.status);
  const statuses = new Map(
    tv.mediaInfo?.seasons?.map((season) => [season.seasonNumber, season.status]),
  );
  const coverage: { aired: number; available: number }[] = [];
  const seasons: SeasonSummary[] = (tv.seasons ?? [])
    .filter((season) => season.seasonNumber > 0)
    .map((season) => {
      const seasonStatus = statuses.get(season.seasonNumber);
      const episodes = episodesBySeason.get(season.seasonNumber)?.episodes;
      const airDate =
        season.airDate ||
        episodes?.flatMap((episode) => (episode.airDate ? [episode.airDate] : [])).sort()[0];
      const unaired = Boolean(airDate && airDate > today);
      const status =
        seasonStatus === undefined && raw === "available" && !unaired
          ? raw
          : availabilityFromStatus(seasonStatus);
      const allAired =
        episodes !== undefined &&
        episodes.length > 0 &&
        episodes.length === season.episodeCount &&
        episodes.every((episode) => episode.airDate && episode.airDate <= today);
      let availability: Availability = status;

      if (status === "partially-available" && !allAired) {
        availability = "some-available";
      } else if (status === "not-in-library" && unaired) {
        availability = "not-yet-aired";
      }

      let availabilityDetail: string | undefined;

      if (unaired) {
        coverage.push({ aired: 0, available: 0 });
      } else if (episodes !== undefined && libraryEpisodes !== undefined) {
        const aired = episodes.filter((episode) => episode.airDate && episode.airDate <= today);
        // Seerr's complete seasons also cover files containing multiple episodes.
        const available =
          status === "available"
            ? aired
            : aired.filter((episode) =>
                libraryEpisodes.has(`${season.seasonNumber}:${episode.episodeNumber}`),
              );
        const completeDates =
          episodes.length === season.episodeCount && episodes.every((episode) => episode.airDate);

        if (completeDates) {
          coverage.push({ aired: aired.length, available: available.length });

          if (aired.length > 0) {
            availabilityDetail = `${available.length} of ${aired.length} aired ${aired.length === 1 ? "episode" : "episodes"} available`;
          }
        }

        if (available.length < aired.length) {
          if (available.length > 0) {
            availability = "partially-available";
          } else {
            availability =
              status === "pending" || status === "processing" ? status : "not-in-library";
          }
        } else if (completeDates && aired.length > 0) {
          availability = aired.length < episodes.length ? "up-to-date" : "available";
        }
      }

      return {
        number: season.seasonNumber,
        name: season.name || `Season ${season.seasonNumber}`,
        episodeCount: season.episodeCount ?? 0,
        airDate,
        availability,
        availabilityDetail,
        airDateLabel: airDate ? `${unaired ? "airs" : "aired"} ${formatDay(airDate)}` : undefined,
      };
    });
  const next = tv.nextEpisodeToAir?.airDate;
  const upcoming =
    Boolean(next && next > today) ||
    seasons.some((season) => season.airDate && season.airDate > today);
  const continuing = tv.inProduction === true || tv.status === "Returning Series";
  const premiere = tv.firstAirDate;
  const notYetAired = Boolean(premiere && premiere > today);
  let airing: string | undefined;

  if (notYetAired && premiere) {
    airing = `Premieres ${formatDay(premiere)}`;
  } else if (next && next > today) {
    airing = `Next episode airs ${formatDay(next)}`;
  } else if (upcoming || continuing) {
    airing = "More episodes expected";
  }

  let availability: Availability = raw === "partially-available" ? "some-available" : raw;

  if (notYetAired && raw === "not-in-library") {
    availability = "not-yet-aired";
  } else if (isInLibrary(raw)) {
    const airedSeasons = seasons.filter((season) => season.airDate && season.airDate <= today);
    const missingAired = airedSeasons.some(
      (season) =>
        season.availability === "partially-available" ||
        (!isInLibrary(season.availability) &&
          season.episodeCount > 0 &&
          (tv.mediaInfo?.seasons !== undefined ||
            (libraryEpisodes !== undefined && episodesBySeason.has(season.number)))),
    );
    const allAiredAvailable =
      seasons.length > 0 &&
      airedSeasons.length > 0 &&
      seasons.every(
        (season) =>
          season.availability === "available" ||
          season.availability === "up-to-date" ||
          (season.airDate && season.airDate > today),
      );

    if (missingAired) {
      availability = "partially-available";
    } else if (allAiredAvailable || raw === "available") {
      availability =
        upcoming || continuing || seasons.some((season) => season.availability === "up-to-date")
          ? "up-to-date"
          : "available";
    }
  }

  let availabilityDetail: string | undefined;

  if (availability === "up-to-date") {
    availabilityDetail = "All aired episodes available";
  } else if (availability === "partially-available") {
    availabilityDetail = "Some aired episodes are missing";
  } else if (availability === "some-available") {
    availabilityDetail = "Aired episode availability is unconfirmed";
  }

  if (seasons.length > 0 && coverage.length === seasons.length) {
    const aired = coverage.reduce((total, season) => total + season.aired, 0);
    const available = coverage.reduce((total, season) => total + season.available, 0);

    if (aired > 0) {
      if (available === aired) {
        availabilityDetail =
          aired === 1 ? "The aired episode is available" : `All ${aired} aired episodes available`;
      } else {
        availabilityDetail = `${available} of ${aired} aired ${aired === 1 ? "episode" : "episodes"} available`;
      }

      if (available === 0 && isInLibrary(availability)) {
        availability = "not-in-library";
      }
    }
  }

  return {
    availability: raw === "blocklisted" ? raw : availability,
    availabilityDetail: raw === "blocklisted" ? undefined : availabilityDetail,
    airing,
    seasons,
  };
}

/** Combine Seerr air dates with the configured Plex library. Missing service data stays uncertain. */
export function tvAvailabilityProgram(tv: TvDetails, today: string) {
  return Effect.gen(function* () {
    const client = yield* SeerrClient;
    const ratingKey = tv.mediaInfo?.ratingKey;
    const libraryEpisodes = ratingKey
      ? yield* Effect.flatMap(PlexLibrary, (plex) => plex.episodes(ratingKey)).pipe(
          Effect.tapError((error) => Effect.logWarning(error.message)),
          Effect.catchAll(() => Effect.succeed(undefined)),
        )
      : undefined;
    const partial = new Set(
      (tv.mediaInfo?.seasons ?? [])
        .filter((season) => season.status === 4)
        .map((season) => season.seasonNumber),
    );
    const needed = (tv.seasons ?? []).filter(
      (season) =>
        season.seasonNumber > 0 &&
        (libraryEpisodes !== undefined
          ? !season.airDate || season.airDate <= today
          : partial.has(season.seasonNumber)),
    );
    const episodes = yield* Effect.forEach(
      needed,
      (season) =>
        client.tvSeason(tv.id, season.seasonNumber).pipe(
          Effect.map((details) => [season.seasonNumber, details] as const),
          Effect.tapError((error) =>
            Effect.logWarning("Seerr episode availability could not be checked", error),
          ),
          Effect.catchAll(() => Effect.succeed(undefined)),
        ),
      { concurrency: 4 },
    );

    return tvAvailability(
      tv,
      today,
      new Map(episodes.filter((entry) => entry !== undefined)),
      libraryEpisodes,
    );
  });
}
