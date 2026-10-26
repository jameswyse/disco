"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DiscoLoader } from "./DiscoLoader";

import type { ReactNode } from "react";

import stateStyles from "./ContentState.module.css";
import styles from "./InfiniteList.module.css";

export type PageItem = Readonly<{ id: string; content: ReactNode }>;
export type LoadedBatch<Cursor> = Readonly<{
  kind: "ok";
  items: readonly PageItem[];
  next: Cursor | undefined;
  summary: string;
}>;
export type PageBatch<Cursor> = LoadedBatch<Cursor> | Readonly<{ kind: "error"; message: string }>;

export function InfiniteList<Cursor>({
  initial,
  loadMore,
  label,
  className,
  empty,
}: Readonly<{
  initial: LoadedBatch<Cursor>;
  loadMore: (cursor: Cursor) => Promise<PageBatch<Cursor>>;
  label: string;
  className: string | undefined;
  empty?: ReactNode;
}>) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string>();
  const [stalled, setStalled] = useState(initial.items.length === 0);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = data.next !== undefined;
  const idleLabel = error ? "Try again" : "Load more";

  const load = useCallback(() => {
    const cursor = data.next;

    if (busy.current || cursor === undefined) {
      return;
    }

    busy.current = true;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await loadMore(cursor);
        busy.current = false;

        if (result.kind === "error") {
          setError(result.message);

          return;
        }

        setStalled(result.items.length === 0);
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
  }, [data.next, loadMore]);

  useEffect(() => {
    const element = sentinel.current;

    if (!element || error || stalled || !hasMore) {
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
  }, [error, hasMore, load, stalled]);

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
            <button
              aria-label={pending ? "Loading more results" : idleLabel}
              className={
                pending ? `${stateStyles.button} ${styles.loadingMore}` : stateStyles.button
              }
              disabled={pending}
              onClick={load}
              type="button"
            >
              {pending ? <DiscoLoader label="Loading more results" size="inline" /> : idleLabel}
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
