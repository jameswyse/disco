import { describe, expect, it } from "vitest";

import { tvAvailability } from "./tvAvailability";

import type { SeasonDetails, TvDetails } from "@/integrations/seerr/schemas";

const today = "2026-09-15";
const returning: TvDetails = {
  id: 1,
  name: "Returning show",
  firstAirDate: "2025-01-01",
  inProduction: true,
  nextEpisodeToAir: { airDate: "2026-09-20" },
  seasons: [
    { id: 10, seasonNumber: 0, episodeCount: 1, airDate: "2025-01-01" },
    { id: 11, seasonNumber: 1, episodeCount: 6, airDate: "2025-01-01" },
    { id: 12, seasonNumber: 2, episodeCount: 8, airDate: "2026-09-20" },
  ],
  mediaInfo: { tmdbId: 1, status: 4, seasons: [{ seasonNumber: 1, status: 5 }] },
};

describe("TV availability", () => {
  it("is up to date when only a future season and specials are absent", () => {
    expect(tvAvailability(returning, today)).toMatchObject({
      availability: "up-to-date",
      availabilityDetail: "All aired episodes available",
      airing: "Next episode airs 20 September",
      seasons: [
        { number: 1, availability: "available" },
        { number: 2, availability: "not-yet-aired", airDateLabel: "airs 20 September" },
      ],
    });
  });

  it("counts an absent season as missing once its premiere date arrives", () => {
    expect(tvAvailability(returning, "2026-09-20")).toMatchObject({
      availability: "partially-available",
      availabilityDetail: "Some aired episodes are missing",
    });
  });

  it("does not claim an unknown season has not aired", () => {
    const seasons = returning.seasons?.map((season) =>
      season.seasonNumber === 2 ? { ...season, airDate: null } : season,
    );
    expect(tvAvailability({ ...returning, seasons }, today).availability).toBe("some-available");
  });

  const partial: TvDetails = {
    id: 2,
    name: "Partly available season",
    firstAirDate: "2026-09-01",
    inProduction: true,
    seasons: [{ id: 21, seasonNumber: 1, episodeCount: 2, airDate: "2026-09-01" }],
    mediaInfo: { tmdbId: 2, status: 4, seasons: [{ seasonNumber: 1, status: 4 }] },
  };
  const episodes: SeasonDetails = {
    episodes: [
      { id: 101, episodeNumber: 1, name: "One", airDate: "2026-09-01" },
      { id: 102, episodeNumber: 2, name: "Two", airDate: "2026-09-20" },
    ],
  };

  it("keeps a partial season uncertain while an episode is unaired", () => {
    expect(tvAvailability(partial, today, new Map([[1, episodes]]))).toMatchObject({
      availability: "some-available",
      seasons: [{ availability: "some-available" }],
    });
  });

  it("confirms a gap when every episode in a partial season has aired", () => {
    expect(tvAvailability(partial, "2026-09-21", new Map([[1, episodes]]))).toMatchObject({
      availability: "partially-available",
      seasons: [{ availability: "partially-available" }],
    });
  });

  it("keeps partial coverage uncertain when episode metadata is unavailable", () => {
    expect(tvAvailability(partial, "2026-09-21").availability).toBe("some-available");
  });

  it("does not count an undated episode as aired", () => {
    expect(
      tvAvailability(
        partial,
        "2026-09-21",
        new Map([
          [
            1,
            {
              episodes: [
                { id: 101, episodeNumber: 1, name: "One", airDate: "2026-09-01" },
                { id: 102, episodeNumber: 2, name: "Two", airDate: null },
              ],
            },
          ],
        ]),
      ),
    ).toMatchObject({ availability: "some-available" });
  });

  it("keeps a fully available finished show available", () => {
    expect(
      tvAvailability(
        {
          ...partial,
          inProduction: false,
          status: "Ended",
          mediaInfo: { tmdbId: 2, status: 5, seasons: [{ seasonNumber: 1, status: 5 }] },
        },
        today,
      ).availability,
    ).toBe("available");
  });

  it("preserves complete coverage when season status data is absent", () => {
    expect(
      tvAvailability(
        { ...partial, inProduction: false, mediaInfo: { tmdbId: 2, status: 5 } },
        today,
      ),
    ).toMatchObject({ availability: "available", seasons: [{ availability: "available" }] });
    expect(
      tvAvailability({ ...partial, mediaInfo: { tmdbId: 2, status: 4 } }, today),
    ).toMatchObject({ availability: "some-available" });
    expect(
      tvAvailability({ ...returning, mediaInfo: { tmdbId: 1, status: 5 } }, today),
    ).toMatchObject({
      availability: "up-to-date",
      seasons: [{ availability: "available" }, { availability: "not-yet-aired" }],
    });
  });

  it("distinguishes an unrequested premiere while preserving pending requests", () => {
    const upcoming: TvDetails = { id: 3, name: "New show", firstAirDate: "2026-09-20" };
    expect(tvAvailability(upcoming, today)).toMatchObject({
      availability: "not-yet-aired",
      airing: "Premieres 20 September",
    });
    expect(
      tvAvailability({ ...upcoming, mediaInfo: { tmdbId: 3, status: 2 } }, today),
    ).toMatchObject({
      availability: "pending",
      airing: "Premieres 20 September",
    });
  });
});

describe("aired episode counts from Plex", () => {
  const show: TvDetails = {
    id: 3,
    name: "Weekly show",
    firstAirDate: "2026-09-01",
    inProduction: true,
    seasons: [{ id: 31, seasonNumber: 1, episodeCount: 3, airDate: "2026-09-01" }],
    mediaInfo: { tmdbId: 3, status: 4, seasons: [{ seasonNumber: 1, status: 4 }] },
  };
  const episodes: ReadonlyMap<number, SeasonDetails> = new Map([
    [
      1,
      {
        episodes: [
          { id: 301, episodeNumber: 1, name: "One", airDate: "2026-09-01" },
          { id: 302, episodeNumber: 2, name: "Two", airDate: "2026-09-08" },
          { id: 303, episodeNumber: 3, name: "Three", airDate: "2026-09-20" },
        ],
      },
    ],
  ]);
  it("is up to date midway through a partial season", () => {
    expect(tvAvailability(show, today, episodes, new Set(["1:1", "1:2"]))).toMatchObject({
      availability: "up-to-date",
      availabilityDetail: "All 2 aired episodes available",
      seasons: [
        { availability: "up-to-date", availabilityDetail: "2 of 2 aired episodes available" },
      ],
    });
  });
  it("does not let a future episode or a special hide a missing aired episode", () => {
    expect(tvAvailability(show, today, episodes, new Set(["1:1", "1:3", "0:1"]))).toMatchObject({
      availability: "partially-available",
      availabilityDetail: "1 of 2 aired episodes available",
    });
  });
  it("shows zero availability when Plex has no aired files", () => {
    expect(tvAvailability(show, today, episodes, new Set())).toMatchObject({
      availability: "not-in-library",
      availabilityDetail: "0 of 2 aired episodes available",
    });
  });
  it("does not invent counts when season metadata could not be loaded", () => {
    expect(tvAvailability(show, today, new Map(), new Set(["1:1", "1:2"]))).toMatchObject({
      availability: "some-available",
      availabilityDetail: "Aired episode availability is unconfirmed",
    });
  });
  it("trusts complete seasons when Plex combines episode entries", () => {
    expect(
      tvAvailability(
        { ...show, mediaInfo: { tmdbId: 3, status: 4, seasons: [{ seasonNumber: 1, status: 5 }] } },
        today,
        episodes,
        new Set(["1:1"]),
      ),
    ).toMatchObject({
      availability: "up-to-date",
      availabilityDetail: "All 2 aired episodes available",
    });
  });
});

it("uses episode air dates when the provider leaves season dates blank", () => {
  const tv: TvDetails = {
    id: 4,
    name: "Undated season",
    firstAirDate: "2026-09-01",
    inProduction: true,
    seasons: [{ id: 41, seasonNumber: 1, episodeCount: 2, airDate: "" }],
    mediaInfo: { tmdbId: 4, status: 4, seasons: [{ seasonNumber: 1, status: 4 }] },
  };
  expect(
    tvAvailability(
      tv,
      today,
      new Map([
        [
          1,
          {
            episodes: [
              { id: 401, episodeNumber: 1, name: "One", airDate: "2026-09-01" },
              { id: 402, episodeNumber: 2, name: "Two", airDate: "2026-09-20" },
            ],
          },
        ],
      ]),
      new Set(["1:1"]),
    ),
  ).toMatchObject({
    availability: "up-to-date",
    availabilityDetail: "The aired episode is available",
    seasons: [{ airDate: "2026-09-01", availability: "up-to-date" }],
  });
});
