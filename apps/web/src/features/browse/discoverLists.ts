export const discoverListLabels = {
  upcoming: "Upcoming",
  recent: "Recently released",
  trending: "Trending",
  popular: "Popular",
} as const;

export type DiscoverListId = keyof typeof discoverListLabels;

/** Display order of the list tabs. */
export const discoverListIds = [
  "upcoming",
  "recent",
  "trending",
  "popular",
] as const satisfies readonly DiscoverListId[];

export const defaultDiscoverListId: DiscoverListId = "trending";

function isDiscoverListId(value: string): value is DiscoverListId {
  return Object.hasOwn(discoverListLabels, value);
}

/** Resolve the `list` search parameter, falling back to the default list for unknown values. */
export function parseDiscoverListId(value: string | string[] | undefined): DiscoverListId {
  const candidate = Array.isArray(value) ? value[0] : value;

  return candidate !== undefined && isDiscoverListId(candidate) ? candidate : defaultDiscoverListId;
}
