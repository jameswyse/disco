import Link from "next/link";

import { discoverListIds, discoverListLabels } from "./discoverLists";
import { placeholderTitles } from "./placeholderTitles";
import { TitleCard } from "./TitleCard";

import type { DiscoverListId } from "./discoverLists";

import styles from "./BrowsePage.module.css";

type BrowsePageProperties = Readonly<{ listId: DiscoverListId }>;

const mediaFilters = ["All", "Movies", "TV"] as const;
const filterMenus = ["Genre", "Language", "Rating"] as const;

export function BrowsePage({ listId }: BrowsePageProperties) {
  const activeListLabel = discoverListLabels[listId];

  return (
    <>
      <header className={styles.tabBar}>
        <nav aria-label="Discover lists" className={styles.tabs}>
          {discoverListIds.map((id) => (
            <Link
              aria-current={id === listId ? "page" : undefined}
              className={id === listId ? styles.activeTab : styles.tab}
              href={`/?list=${id}`}
              key={id}
            >
              {discoverListLabels[id]}
              <small className={styles.tabCount}>{placeholderTitles.length}</small>
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
        <button className={styles.requestsButton} disabled type="button">
          Requests
        </button>
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
          <input className={styles.toggleInput} defaultChecked disabled type="checkbox" />
          <span aria-hidden="true" className={styles.toggleTrack} />
        </label>
      </div>

      <p className={styles.summary}>
        {activeListLabel} on <b>Netflix</b> · {placeholderTitles.length} placeholder titles until
        Seerr is connected
      </p>

      <ul aria-label={`${activeListLabel} titles`} className={styles.grid}>
        {placeholderTitles.map((title) => (
          <TitleCard key={`${title.mediaType}-${title.id}`} title={title} />
        ))}
      </ul>
    </>
  );
}
