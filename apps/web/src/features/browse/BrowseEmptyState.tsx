import Link from "next/link";

import { browseHref } from "./browseHref";
import { hasDiscoverFilters, noFilters } from "./filters";
import { providerOriginals } from "./providerOriginals";

import type { View } from "@/features/views/views";

import type { BrowseLocation } from "./browseHref";

import styles from "./BrowseEmptyState.module.css";

export function BrowseEmptyState({
  location,
  hiddenAvailable,
  view,
}: Readonly<{
  location: BrowseLocation;
  hiddenAvailable: number;
  view: View;
}>) {
  const unsupported =
    location.listId === "upcoming" &&
    view.source.kind === "provider" &&
    providerOriginals(view.source.providerId, "tv") === undefined;
  const filtered =
    hasDiscoverFilters(location.filters) ||
    location.filters.mediaType !== "all" ||
    location.filters.hideAvailable;
  const listHeading = {
    upcoming: "No upcoming titles listed",
    recent: "No recent premieres listed",
    popular: "No titles listed yet",
    trending: "No titles listed yet",
  }[location.listId];
  let heading = filtered ? "No titles match your filters" : listHeading;
  let description = filtered
    ? "Try clearing your filters to see more titles in this view."
    : "There are no titles to show in this list right now. Explore another list or check back later.";

  if (hiddenAvailable > 0) {
    heading = "These titles are already available";
    description = "Turn off Hide already available to see the titles on this page.";
  }

  if (unsupported) {
    heading = "Upcoming originals aren’t supported yet";
    description = "Explore this service’s current catalogue in Popular.";
  }

  return (
    <section aria-labelledby="browse-empty-heading" className={styles.emptyState}>
      <svg
        aria-hidden="true"
        className={styles.emptyIcon}
        fill="none"
        height="32"
        width="32"
        viewBox="0 0 48 48"
      >
        <rect height="30" rx="5" stroke="currentColor" strokeWidth="2" width="36" x="6" y="9" />
        <path d="M6 18h36M16 9l6 9M28 9l6 9M18 29h12" stroke="currentColor" strokeWidth="2" />
      </svg>
      <h2 className={styles.heading} id="browse-empty-heading">
        {heading}
      </h2>
      <p className={styles.description}>{description}</p>
      <div className={styles.emptyActions}>
        {filtered && !unsupported ? (
          <Link
            className={styles.action}
            href={browseHref({
              ...location,
              filters:
                hiddenAvailable > 0 ? { ...location.filters, hideAvailable: false } : noFilters,
              page: hiddenAvailable > 0 ? location.page : 1,
            })}
          >
            {hiddenAvailable > 0 ? "Show available titles" : "Clear filters"}
          </Link>
        ) : null}
        {location.listId !== "popular" ? (
          <Link
            className={styles.action}
            href={browseHref({ ...location, listId: "popular", filters: noFilters, page: 1 })}
          >
            Browse Popular
          </Link>
        ) : null}
        {location.page > 1 ? (
          <Link className={styles.action} href={browseHref({ ...location, page: 1 })}>
            Back to first page
          </Link>
        ) : null}
      </div>
    </section>
  );
}
