import { filterEntries } from "./filters";

import type { DiscoverListId } from "./discoverLists";
import type { BrowseFilters } from "./filters";

export type BrowseLocation = Readonly<{
  viewId: string;
  listId: DiscoverListId;
  filters: BrowseFilters;
  defaultLanguage: string | undefined;
}>;

export function browseHref(location: BrowseLocation): `/${string}` {
  const entries: [string, string][] = [];

  if (location.listId !== "trending") {
    entries.push(["list", location.listId]);
  }

  entries.push(...filterEntries(location.filters, location.defaultLanguage));

  const encoded = new URLSearchParams(entries).toString();

  return encoded === "" ? `/${location.viewId}` : `/${location.viewId}?${encoded}`;
}
