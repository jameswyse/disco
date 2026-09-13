import { filterEntries } from "./filters";

import type { DiscoverListId } from "./discoverLists";
import type { BrowseFilters } from "./filters";

export type BrowseLocation = Readonly<{
  viewId: string;
  listId: DiscoverListId;
  filters: BrowseFilters;
  page: number;
}>;

/** URL for a browse screen; only non-default state is carried in the query string. */
export function browseHref(location: BrowseLocation): `/${string}` {
  const entries: [string, string][] = [];

  if (location.listId !== "trending") {
    entries.push(["list", location.listId]);
  }

  entries.push(...filterEntries(location.filters));

  if (location.page > 1) {
    entries.push(["page", String(location.page)]);
  }

  const encoded = new URLSearchParams(entries).toString();

  return encoded === "" ? `/${location.viewId}` : `/${location.viewId}?${encoded}`;
}
