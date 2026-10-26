import { Schema } from "effect";

import { isInLibrary, isRequested } from "@/features/title/title";

import type { Title } from "@/features/title/title";

import type { BrowseFilters } from "./filters";

export const browseBatchSize = 96;
export const tmdbPageLimit = 500;

const BrowseCursor = Schema.Struct({
  page: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 1, maximum: tmdbPageLimit })),
  ),
  offset: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isGreaterThanOrEqualTo(0)),
  ),
});
export type BrowseCursor = typeof BrowseCursor.Type;

export const decodeBrowseCursor = Schema.decodeUnknownSync(BrowseCursor);

export const firstBrowseCursor: BrowseCursor = { page: 1, offset: 0 };

export type BrowseChunk = Readonly<{
  page: number;
  lastPage: number;
  titles: readonly Title[];
}>;

export type BrowseBatch = Readonly<{
  titles: readonly Title[];
  hiddenAvailable: number;
  hiddenRequested: number;
  next: BrowseCursor | undefined;
  full: boolean;
}>;

type HideFilters = Pick<BrowseFilters, "hideAvailable" | "hideRequested">;

export function collectBrowseBatch(
  chunks: readonly BrowseChunk[],
  cursor: BrowseCursor,
  filters: HideFilters,
): BrowseBatch {
  const titles: Title[] = [];
  const seen = new Set<string>();
  let hiddenAvailable = 0;
  let hiddenRequested = 0;
  let next: BrowseCursor | undefined = cursor;

  const batch = (full: boolean): BrowseBatch => ({
    titles,
    hiddenAvailable,
    hiddenRequested,
    next,
    full,
  });

  for (const chunk of chunks) {
    const start = chunk.page === cursor.page ? cursor.offset : 0;

    for (const [index, title] of chunk.titles.entries()) {
      if (index < start) {
        continue;
      }

      if (titles.length === browseBatchSize) {
        next = { page: chunk.page, offset: index };

        return batch(true);
      }

      const key = `${title.mediaType}:${title.id}`;

      if (title.availability === "blocklisted" || seen.has(key)) {
        continue;
      }

      seen.add(key);

      if (filters.hideAvailable && isInLibrary(title.availability)) {
        hiddenAvailable += 1;
      } else if (filters.hideRequested && isRequested(title.availability)) {
        hiddenRequested += 1;
      } else {
        titles.push(title);
      }
    }

    next = chunk.page < chunk.lastPage ? { page: chunk.page + 1, offset: 0 } : undefined;

    if (next === undefined) {
      break;
    }
  }

  return batch(titles.length === browseBatchSize);
}
