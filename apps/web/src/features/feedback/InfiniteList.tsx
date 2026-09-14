"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { ReactNode } from "react";

import stateStyles from "./ContentState.module.css";
import styles from "@/features/browse/BrowsePage.module.css";

export type PageItem = Readonly<{ id: string; content: ReactNode }>;
export type PageBatch =
  | Readonly<{
      kind: "ok";
      items: readonly PageItem[];
      page: number;
      totalPages: number;
      summary: string;
    }>
  | Readonly<{ kind: "error"; message: string }>;
type LoadedPage = Extract<PageBatch, { kind: "ok" }>;

function AccumulatedList({
  initial,
  loadPage,
  label,
  className,
  empty,
}: Readonly<{
  initial: LoadedPage;
  loadPage: (page: number) => Promise<PageBatch>;
  label: string;
  className: string | undefined;
  empty?: ReactNode;
}>) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = data.page < data.totalPages;
  const idleLabel = error ? "Try again" : "Load more";
  const load = useCallback(() => {
    if (busy.current || !hasMore) {
      return;
    }

    busy.current = true;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await loadPage(data.page + 1);
        busy.current = false;

        if (result.kind === "error") {
          setError(result.message);

          return;
        }

        setData((previous) => {
          const seen = new Set(previous.items.map((item) => item.id));

          return {
            ...result,
            items: [...previous.items, ...result.items.filter((item) => !seen.has(item.id))],
          };
        });
      } catch {
        setError("The next page couldn’t be loaded. Your results are still here.");
        busy.current = false;
      }
    });
  }, [data.page, hasMore, loadPage]);

  useEffect(() => {
    const element = sentinel.current;

    if (!element || error || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [error, hasMore, load]);

  return (
    <>
      {data.items.length > 0 ? (
        <ul aria-label={label} className={className}>
          {data.items.map((item) => (
            <Fragment key={item.id}>{item.content}</Fragment>
          ))}
        </ul>
      ) : null}
      {data.items.length === 0 && !hasMore ? empty : null}
      <footer className={styles.footer}>
        {data.items.length > 0 || hasMore ? <p className={styles.summary}>{data.summary}</p> : null}
        <div ref={sentinel}>
          {error ? <p role="alert">{error}</p> : null}
          {hasMore ? (
            <button className={stateStyles.button} disabled={pending} onClick={load} type="button">
              {pending ? "Loading more…" : idleLabel}
            </button>
          ) : (
            <span className={styles.summary}>
              {data.items.length > 0 ? "You’re all caught up" : ""}
            </span>
          )}
        </div>
        <span aria-live="polite" className={styles.visuallyHidden}>
          {pending ? "Loading more results" : `${data.items.length} results loaded`}
        </span>
      </footer>
    </>
  );
}

/** A refreshed server payload replaces the old result set, including any appended pages. */
export function InfiniteList(properties: Parameters<typeof AccumulatedList>[0]) {
  const [source, setSource] = useState({ initial: properties.initial, revision: 0 });

  if (source.initial !== properties.initial) {
    setSource({ initial: properties.initial, revision: source.revision + 1 });
  }

  return <AccumulatedList {...properties} key={source.revision} />;
}
