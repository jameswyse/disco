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
  release: { premiere: "2026-01-01", home: "2026-03-01", released: true },
  scores: { tmdb: undefined, rottenTomatoes: undefined, imdb: undefined },
  cast: [],
  creators: [],
  directors: [],
  companies: [],
  networks: [],
  keywords: [],
  trailerEmbedUrl: undefined,
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

  it("marks searching as active once a released request is processing without downloads", () => {
    expect(states({ ...base, availability: "processing", requests: [approved] })).toEqual([
      "requested:done",
      "waiting:done",
      "searching:active",
      "downloading:pending",
      "available:pending",
    ]);
  });

  it("waits for release while a requested film has no past digital release", () => {
    const steps = requestTimeline({
      ...base,
      availability: "processing",
      requests: [approved],
      release: { premiere: "2026-12-17", home: undefined, released: false },
    });

    expect(steps.map((step) => `${step.id}:${step.state}`)).toEqual([
      "requested:done",
      "waiting:active",
      "searching:pending",
      "downloading:pending",
      "available:pending",
    ]);
    expect(steps[1]?.detail).toBe("In cinemas 17 Dec 2026 · no digital release date yet");
  });

  it("describes when a series will air", () => {
    const steps = requestTimeline({
      ...base,
      mediaType: "tv",
      availability: "processing",
      requests: [approved],
      release: { premiere: "2027-02-01", home: undefined, released: false },
    });

    expect(steps[1]?.detail).toBe("Airs 1 Feb 2027");
    expect(steps[2]?.detail).toBe("Sonarr");
  });

  it("moves to downloading when the download client reports progress", () => {
    const steps = requestTimeline({
      ...base,
      availability: "processing",
      requests: [approved],
      downloads: [{ title: "Film.2026.1080p", progress: 0.4, timeLeft: "00:10:00" }],
    });

    expect(steps.map((step) => step.state)).toEqual(["done", "done", "done", "active", "pending"]);
    expect(steps[3]?.detail).toBe("Film.2026.1080p · 40%");
  });

  it("completes every step for available titles, even without a Seerr request", () => {
    const steps = requestTimeline({ ...base, availability: "available" });

    expect(steps.map((step) => step.state)).toEqual(["done", "done", "done", "done", "done"]);
    expect(steps[0]?.detail).toBe("Available without a Seerr request");
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
      "waiting:done",
      "searching:pending",
      "downloading:pending",
      "available:pending",
    ]);
  });
});
