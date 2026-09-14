import Image from "next/image";
import Link from "next/link";

import { titleHref } from "@/features/title/titleRoute";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import { loadRequests, requestFilters } from "./loadRequests";

import type { Availability } from "@/features/browse/title";

import type { RequestFilter, RequestRow } from "./loadRequests";

import styles from "./RequestsPage.module.css";
import browseStyles from "@/features/browse/BrowsePage.module.css";

type RequestsPageProperties = Readonly<{ filter: RequestFilter; page: number }>;

const requestStatusLabels = {
  pending: "Pending approval",
  approved: "Approved",
  declined: "Declined",
  failed: "Failed",
  completed: "Completed",
} satisfies Record<RequestRow["status"], string>;

const availabilityLabels = {
  available: "In Plex",
  "partially-available": "Partly in Plex",
  processing: "Processing",
  pending: "Pending",
  "not-in-library": "Not yet",
} satisfies Record<Availability, string>;

const availabilityClasses = {
  available: styles.available,
  "partially-available": styles.available,
  processing: styles.processing,
  pending: styles.pending,
  "not-in-library": styles.none,
} satisfies Record<Availability, string | undefined>;

function requestsHref(filter: RequestFilter, page: number): `/requests${string}` {
  const parameters = new URLSearchParams();

  if (filter !== "all") {
    parameters.set("filter", filter);
  }

  if (page > 1) {
    parameters.set("page", String(page));
  }

  const encoded = parameters.toString();

  return encoded === "" ? "/requests" : `/requests?${encoded}`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

export async function RequestsPage({ filter, page }: RequestsPageProperties) {
  const result = await loadRequests(filter, page);

  return (
    <>
      <header className={browseStyles.tabBar}>
        <nav aria-label="Request filters" className={browseStyles.tabs}>
          {requestFilters.map((item) => (
            <Link
              aria-current={item.id === filter ? "page" : undefined}
              className={item.id === filter ? browseStyles.activeTab : browseStyles.tab}
              href={requestsHref(item.id, 1)}
              key={item.id}
            >
              {item.label}
            </Link>
          ))}
        </nav>

      </header>

      {result.kind === "error" ? (
        <p className={browseStyles.summary} role="alert">
          {result.message}
        </p>
      ) : (
        <>
          <p className={browseStyles.summary}>
            Requests · page {result.page} of {Math.max(1, result.totalPages)}
          </p>
          {result.rows.length === 0 ? (
            <p className={browseStyles.empty}>No requests match this filter.</p>
          ) : (
            <ul aria-label="Requests" className={styles.list}>
              {result.rows.map((row) => (
                <li className={styles.row} key={row.id}>
                  <Link className={styles.poster} href={titleHref(row.mediaType, row.tmdbId)}>
                    {row.posterPath ? (
                      <Image
                        alt=""
                        height={72}
                        src={tmdbImageUrl("w185", row.posterPath)}
                        unoptimized
                        width={48}
                      />
                    ) : null}
                  </Link>
                  <div className={styles.title}>
                    <Link href={titleHref(row.mediaType, row.tmdbId)}>
                      {row.name}
                      {row.year ? <span className={styles.year}> ({row.year})</span> : null}
                    </Link>
                    <span className={styles.subtitle}>
                      {row.mediaType === "movie" ? "Film" : "Series"}
                      {row.seasons.length > 0
                        ? ` · ${row.seasons.length === 1 ? "Season" : "Seasons"} ${row.seasons.join(", ")}`
                        : ""}
                      {row.requestedBy ? ` · ${row.requestedBy}` : ""} ·{" "}
                      {formatWhen(row.requestedAt)}
                    </span>
                  </div>
                  <span className={styles.status}>{requestStatusLabels[row.status]}</span>
                  <span className={`${styles.pill} ${availabilityClasses[row.availability]}`}>
                    {availabilityLabels[row.availability]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Pages" className={browseStyles.pagination}>
            {result.page > 1 ? (
              <Link className={browseStyles.pageLink} href={requestsHref(filter, page - 1)}>
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {result.page < result.totalPages ? (
              <Link className={browseStyles.pageLink} href={requestsHref(filter, page + 1)}>
                Next →
              </Link>
            ) : null}
          </nav>
        </>
      )}
    </>
  );
}
