import Link from "next/link";

import { discoverListIds, discoverListLabels } from "./discoverLists";
import { loadBrowse } from "./loadBrowse";
import { TitleCard } from "./TitleCard";

import type { View } from "@/features/views/views";

import type { DiscoverListId } from "./discoverLists";
import type { BrowseResult } from "./loadBrowse";

import styles from "./BrowsePage.module.css";

type BrowsePageProperties = Readonly<{ view: View; listId: DiscoverListId; page: number }>;

const mediaFilters = ["All", "Movies", "TV"] as const;
const filterMenus = ["Genre", "Language", "Rating"] as const;

function browseHref(view: View, listId: DiscoverListId, page: number): `/${string}` {
  const query = new URLSearchParams({ list: listId });

  if (page > 1) {
    query.set("page", String(page));
  }

  return `/${view.id}?${query.toString()}`;
}

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
    </p>
  );
}

export async function BrowsePage({ view, listId, page }: BrowsePageProperties) {
  const result = await loadBrowse(view, listId, page);

  return (
    <>
      <header className={styles.tabBar}>
        <nav aria-label="Discover lists" className={styles.tabs}>
          {discoverListIds.map((id) => (
            <Link
              aria-current={id === listId ? "page" : undefined}
              className={id === listId ? styles.activeTab : styles.tab}
              href={browseHref(view, id, 1)}
              key={id}
            >
              {discoverListLabels[id]}
            </Link>
          ))}
        </nav>
        <label className={styles.search}>
          <input
            aria-label="Search"
            className={styles.searchInput}
            disabled
            placeholder="Search movies, shows, people…"
            type="search"
          />
          <kbd className={styles.searchShortcut}>/</kbd>
        </label>
        {result.kind === "ok" ? (
          <a
            className={styles.requestsButton}
            href={`${result.seerrOrigin}/requests`}
            rel="noreferrer"
            target="_blank"
          >
            Requests
          </a>
        ) : null}
      </header>

      <div className={styles.filters}>
        <div aria-label="Media type" className={styles.segmentedControl} role="group">
          {mediaFilters.map((filter) => (
            <button
              aria-pressed={filter === "All"}
              className={styles.segment}
              disabled
              key={filter}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
        {filterMenus.map((menu) => (
          <button className={styles.dropdown} disabled key={menu} type="button">
            {menu} <span aria-hidden="true">▾</span>
          </button>
        ))}
        <label className={styles.toggle}>
          Hide what's already in Plex
          <input className={styles.toggleInput} disabled type="checkbox" />
          <span aria-hidden="true" className={styles.toggleTrack} />
        </label>
      </div>

      <Summary listId={listId} result={result} view={view} />

      {result.kind === "ok" ? (
        <>
          <ul aria-label={`${discoverListLabels[listId]} titles`} className={styles.grid}>
            {result.titles.map((title) => (
              <TitleCard
                key={`${title.mediaType}-${title.id}`}
                seerrOrigin={result.seerrOrigin}
                title={title}
              />
            ))}
          </ul>
          <nav aria-label="Pages" className={styles.pagination}>
            {result.page > 1 ? (
              <Link className={styles.pageLink} href={browseHref(view, listId, result.page - 1)}>
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {result.page < result.totalPages ? (
              <Link className={styles.pageLink} href={browseHref(view, listId, result.page + 1)}>
                Next →
              </Link>
            ) : null}
          </nav>
        </>
      ) : null}
    </>
  );
}
