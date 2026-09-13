import Link from "next/link";

import { SearchBox } from "@/features/search/SearchBox";
import { viewMediaTypes } from "@/features/views/views";

import { browseHref } from "./browseHref";
import { discoverListIds, discoverListLabels } from "./discoverLists";
import { FilterBar } from "./FilterBar";
import { loadBrowse } from "./loadBrowse";
import { TitleGrid } from "./TitleGrid";

import type { View } from "@/features/views/views";

import type { BrowseLocation } from "./browseHref";
import type { DiscoverListId } from "./discoverLists";
import type { BrowseFilters } from "./filters";
import type { BrowseResult } from "./loadBrowse";

import styles from "./BrowsePage.module.css";

type BrowsePageProperties = Readonly<{
  view: View;
  listId: DiscoverListId;
  filters: BrowseFilters;
  page: number;
}>;

function Summary({
  view,
  listId,
  result,
}: Readonly<{ view: View; listId: DiscoverListId; result: BrowseResult }>) {
  if (result.kind === "error") {
    return (
      <p className={styles.summary} role="alert">
        {result.message}
      </p>
    );
  }

  return (
    <p className={styles.summary}>
      {discoverListLabels[listId]} on <b>{view.label}</b> ·{" "}
      {result.totalResults.toLocaleString("en-AU")} titles · page {result.page} of{" "}
      {result.totalPages.toLocaleString("en-AU")}
      {result.hiddenAvailable > 0
        ? ` · ${result.hiddenAvailable} hidden because they're already in your library`
        : ""}
    </p>
  );
}

export async function BrowsePage({ view, listId, filters, page }: BrowsePageProperties) {
  const result = await loadBrowse(view, listId, filters, page);
  const location: BrowseLocation = { viewId: view.id, listId, filters, page };

  return (
    <>
      <header className={styles.tabBar}>
        <nav aria-label="Discover lists" className={styles.tabs}>
          {discoverListIds.map((id) => (
            <Link
              aria-current={id === listId ? "page" : undefined}
              className={id === listId ? styles.activeTab : styles.tab}
              href={browseHref({ ...location, listId: id, page: 1 })}
              key={id}
            >
              {discoverListLabels[id]}
            </Link>
          ))}
        </nav>
        <SearchBox />
        <Link className={styles.requestsButton} href="/requests">
          Requests
        </Link>
      </header>

      <FilterBar
        genres={result.kind === "ok" ? result.genres : []}
        location={location}
        mixedMedia={viewMediaTypes(view).length > 1}
      />

      <Summary listId={listId} result={result} view={view} />

      {result.kind === "ok" ? (
        <>
          <TitleGrid label={`${discoverListLabels[listId]} titles`} titles={result.titles} />
          <nav aria-label="Pages" className={styles.pagination}>
            {result.page > 1 ? (
              <Link className={styles.pageLink} href={browseHref({ ...location, page: page - 1 })}>
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {result.page < result.totalPages ? (
              <Link className={styles.pageLink} href={browseHref({ ...location, page: page + 1 })}>
                Next →
              </Link>
            ) : null}
          </nav>
        </>
      ) : null}
    </>
  );
}
