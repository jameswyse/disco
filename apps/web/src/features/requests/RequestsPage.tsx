import Image from "next/image";
import Link from "next/link";

import { ContentState } from "@/features/feedback/ContentState";
import { InfiniteList } from "@/features/feedback/InfiniteList";
import { titleHref } from "@/features/title/titleRoute";
import { tmdbImageUrl } from "@/integrations/seerr/images";
import { decodePageNumber } from "@/platform/pageNumber";

import { loadRequests, requestFilters } from "./loadRequests";
import { requestBadge } from "./requestBadge";

import type { PageBatch } from "@/features/feedback/InfiniteList";

import type { RequestFilter } from "./loadRequests";

import styles from "./RequestsPage.module.css";
import browseStyles from "@/features/browse/BrowsePage.module.css";

type RequestsPageProperties = Readonly<{ filter: RequestFilter; page: number }>;

const badgeClasses = {
  available: styles.available,
  processing: styles.processing,
  pending: styles.pending,
  negative: styles.negative,
  neutral: styles.neutral,
} satisfies Record<ReturnType<typeof requestBadge>["tone"], string | undefined>;

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

function requestsBatch(result: Awaited<ReturnType<typeof loadRequests>>): PageBatch {
  if (result.kind === "error") {
    return result;
  }

  return {
    kind: "ok",
    page: result.page,
    totalPages: result.totalPages,
    summary: `Requests · page ${result.page} of ${Math.max(1, result.totalPages)}`,
    items: result.rows.map((row) => {
      const badge = requestBadge(row);

      return {
        id: String(row.id),
        content: (
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
                {row.qualityProfile ? ` · ${row.qualityProfile}` : ""}
                {row.requestedBy ? ` · ${row.requestedBy}` : ""} · {formatWhen(row.requestedAt)}
              </span>
            </div>
            <span className={`${styles.pill} ${badgeClasses[badge.tone]}`}>{badge.label}</span>
          </li>
        ),
      };
    }),
  };
}

export async function RequestsPage({ filter, page }: RequestsPageProperties) {
  async function loadPage(nextPage: number): Promise<PageBatch> {
    "use server";

    return requestsBatch(await loadRequests(filter, decodePageNumber(nextPage)));
  }

  const result = await loadPage(page);

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
        <ContentState title="Requests couldn’t be loaded" message={result.message} retry />
      ) : (
        <InfiniteList
          initial={result}
          loadPage={loadPage}
          key={`${filter}:${page}`}
          className={styles.list}
          label="Requests"
          empty={
            <ContentState
              title="No requests here yet"
              message="Requests matching this filter will appear here."
            />
          }
        />
      )}
    </>
  );
}
