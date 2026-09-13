import { describe, expect, it } from "vitest";

import { requestTimeline } from "./requestTimeline";

import type { RequestSummary, TitleDetails } from "./titleDetails";

const base: TitleDetails = {
  id: 1,
  mediaType: "movie",
  name: "Film",
  year: 2026,
  tagline: undefined,
  overview: "",
  posterPath: undefined,
  backdropPath: undefined,
  genres: [],
  originalLanguage: undefined,
  countries: [],
  status: undefined,
  runtimeMinutes: undefined,
  episodeCount: undefined,
  seasonCount: undefined,
  seriesType: undefined,
  certification: undefined,
  scores: { tmdb: undefined, rottenTomatoes: undefined, imdb: undefined },
  cast: [],
  creators: [],
  directors: [],
  companies: [],
  networks: [],
  keywords: [],
  trailerUrl: undefined,
  streamingOn: [],
  availability: "not-in-library",
  plexUrl: undefined,
  requests: [],
  downloads: [],
  seasons: [],
  onWatchlist: false,
  externalLinks: [],
};

const approved: RequestSummary = {
  id: 9,
  status: "approved",
  requestedBy: "James",
  requestedAt: "2026-09-13T07:52:00.000Z",
  seasons: [],
};

const states = (details: TitleDetails) =>
  requestTimeline(details).map((step) => `${step.id}:${step.state}`);

describe("requestTimeline", () => {
  it("is empty for titles nobody has requested", () => {
    expect(requestTimeline(base)).toEqual([]);
  });

  it("marks searching as active once a request is processing without downloads", () => {
    expect(states({ ...base, availability: "processing", requests: [approved] })).toEqual([
      "requested:done",
      "searching:active",
      "downloading:pending",
      "available:pending",
    ]);
  });

  it("moves to downloading when the download client reports progress", () => {
    const steps = requestTimeline({
      ...base,
      availability: "processing",
      requests: [approved],
      downloads: [{ title: "Film.2026.1080p", progress: 0.4, timeLeft: "00:10:00" }],
    });

    expect(steps.map((step) => step.state)).toEqual(["done", "done", "active", "pending"]);
    expect(steps[2]?.detail).toBe("Film.2026.1080p · 40%");
  });

  it("completes every step for titles already in Plex, even without a Seerr request", () => {
    const steps = requestTimeline({ ...base, availability: "available" });

    expect(steps.map((step) => step.state)).toEqual(["done", "done", "done", "done"]);
    expect(steps[0]?.detail).toBe("Added to Plex outside Seerr");
  });

  it("stops at declined for declined requests", () => {
    expect(states({ ...base, requests: [{ ...approved, status: "declined" }] })).toEqual([
      "requested:done",
      "declined:active",
    ]);
  });

  it("holds at the request step while approval is pending", () => {
    expect(
      states({ ...base, availability: "pending", requests: [{ ...approved, status: "pending" }] }),
    ).toEqual([
      "requested:active",
      "searching:pending",
      "downloading:pending",
      "available:pending",
    ]);
  });
});
