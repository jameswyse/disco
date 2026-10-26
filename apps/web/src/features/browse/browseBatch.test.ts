import { describe, expect, it } from "vitest";

import { browseBatchSize, collectBrowseBatch, firstBrowseCursor } from "./browseBatch";
import { defaultFilters } from "./filters";

import type { Availability, Title } from "@/features/title/title";

import type { BrowseChunk } from "./browseBatch";

function title(id: number, availability: Availability = "not-in-library"): Title {
  return {
    id,
    mediaType: "movie",
    name: `Film ${id}`,
    year: undefined,
    rating: undefined,
    voteCount: 0,
    popularity: 0,
    overview: "",
    posterPath: undefined,
    backdropPath: undefined,
    genres: [],
    availability,
    runtimeMinutes: undefined,
    seasonCount: undefined,
  };
}

function chunk(page: number, titles: readonly Title[], lastPage = 50): BrowseChunk {
  return { page, lastPage, titles };
}

function pageOfFilms(
  page: number,
  statusOf: (id: number) => Availability = () => "not-in-library",
) {
  return chunk(
    page,
    Array.from({ length: 20 }, (_, index) => {
      const id = (page - 1) * 20 + index + 1;

      return title(id, statusOf(id));
    }),
  );
}

const ids = (titles: readonly Title[]) => titles.map((item) => item.id);

describe("collectBrowseBatch", () => {
  it("fills a full batch and resumes from the next unread title", () => {
    const chunks = [1, 2, 3, 4, 5, 6].map((page) => pageOfFilms(page));
    const first = collectBrowseBatch(chunks, firstBrowseCursor, defaultFilters);

    expect(first.full).toBe(true);
    expect(ids(first.titles)).toStrictEqual(
      Array.from({ length: browseBatchSize }, (_, index) => index + 1),
    );
    expect(first.next).toStrictEqual({ page: 5, offset: 16 });

    const resumed = collectBrowseBatch(chunks.slice(4), { page: 5, offset: 16 }, defaultFilters);

    expect(ids(resumed.titles)).toStrictEqual(Array.from({ length: 24 }, (_, index) => index + 97));
  });

  it("counts hidden titles and skips blocklisted ones", () => {
    const batch = collectBrowseBatch(
      [
        chunk(1, [
          title(1, "available"),
          title(2, "processing"),
          title(3, "blocklisted"),
          title(4),
          title(5, "pending"),
          title(6, "some-available"),
        ]),
      ],
      firstBrowseCursor,
      defaultFilters,
    );

    expect(ids(batch.titles)).toStrictEqual([4]);
    expect(batch).toMatchObject({ hiddenAvailable: 2, hiddenRequested: 2 });
  });

  it("keeps the batch full when filters hide titles", () => {
    const statusOf = (id: number): Availability => (id % 3 === 0 ? "available" : "not-in-library");
    const chunks = [1, 2, 3, 4, 5, 6, 7, 8].map((page) => pageOfFilms(page, statusOf));
    const batch = collectBrowseBatch(chunks, firstBrowseCursor, defaultFilters);

    expect(batch.titles).toHaveLength(browseBatchSize);
    expect(batch.hiddenAvailable).toBe(47);
  });

  it("drops titles repeated on a later page", () => {
    const batch = collectBrowseBatch(
      [chunk(1, [title(1), title(2)]), chunk(2, [title(2), title(3)])],
      firstBrowseCursor,
      defaultFilters,
    );

    expect(ids(batch.titles)).toStrictEqual([1, 2, 3]);
  });

  it("stops after the last page", () => {
    const batch = collectBrowseBatch(
      [chunk(1, [title(1)], 2), chunk(2, [title(2)], 2)],
      firstBrowseCursor,
      defaultFilters,
    );

    expect(batch).toMatchObject({ full: false, next: undefined });
    expect(ids(batch.titles)).toStrictEqual([1, 2]);
  });

  it("returns a partial batch that continues where fetching stopped", () => {
    const batch = collectBrowseBatch([pageOfFilms(1)], firstBrowseCursor, defaultFilters);

    expect(batch).toMatchObject({ full: false, next: { page: 2, offset: 0 } });
  });
});
