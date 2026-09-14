"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useId, useRef, useState } from "react";

import { tmdbImageUrl } from "@/integrations/seerr/images";

import { autocomplete } from "./autocomplete";
import { searchItemHref } from "./searchResult";

import type { SearchResult } from "./loadSearch";

import styles from "./SearchBox.module.css";

function SearchInput({ initialQuery }: Readonly<{ initialQuery: string }>) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<Readonly<{ query: string; result: SearchResult }>>();
  const listId = useId();
  const term = query.trim();
  const result = response?.query === term ? response.result : undefined;
  const expanded = open && term.length > 0;

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target;

      if (event.key === "Escape" && target instanceof Node && root.current?.contains(target)) {
        input.current?.focus();
        setOpen(false);
      }

      if (
        event.key === "/" &&
        !(
          target instanceof HTMLElement &&
          (target.matches("input, textarea, select") || target.isContentEditable)
        )
      ) {
        event.preventDefault();
        input.current?.focus();
      }
    }

    function dismiss(event: FocusEvent | PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("focusin", dismiss);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", shortcut);

    return () => {
      document.removeEventListener("keydown", shortcut);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, []);

  useEffect(() => {
    if (!expanded) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void autocomplete(term)
        .then((next) => {
          if (!cancelled) {
            setResponse({ query: term, result: next });
          }

          return undefined;
        })
        .catch(() => {
          if (!cancelled) {
            setResponse({
              query: term,
              result: {
                kind: "error",
                message: "Suggestions couldn’t be loaded. Press Enter to search.",
              },
            });
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [expanded, term]);

  return (
    <div
      className={styles.wrapper}
      data-search
      ref={root}
      role="group"
      aria-label="Search titles and people"
    >
      <form
        className={styles.search}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();

          if (term) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(term)}`);
          }
        }}
      >
        <svg aria-hidden="true" className={styles.icon} fill="none" viewBox="0 0 20 20">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" />
        </svg>
        <input
          aria-controls={expanded ? listId : undefined}
          aria-expanded={expanded}
          aria-haspopup="dialog"
          role="combobox"
          aria-label="Search"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              input.current?.focus();
            }

            if (event.key === "ArrowDown" && event.target === input.current) {
              event.preventDefault();
              event.currentTarget
                .closest("[data-search]")
                ?.querySelector<HTMLAnchorElement>("[data-suggestion]")
                ?.focus();
            }
          }}
          autoComplete="off"
          className={styles.input}
          maxLength={300}
          name="q"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search titles and people…"
          ref={input}
          type="search"
          value={query}
        />
        <kbd className={styles.shortcut}>/</kbd>
      </form>
      {expanded ? (
        <div
          aria-label="Search suggestions"
          className={styles.suggestions}
          id={listId}
          role="dialog"
        >
          {!result ? (
            <p className={styles.message} role="status">
              Searching…
            </p>
          ) : null}
          {result?.kind === "error" ? (
            <p className={styles.message} role="alert">
              {result.message}
            </p>
          ) : null}
          {result?.kind === "ok" && result.items.length === 0 ? (
            <p className={styles.message} role="status">
              No results for “{term}”. Try another name.
            </p>
          ) : null}
          {result?.kind === "ok" && result.items.length > 0 ? (
            <ul aria-label="Search suggestions">
              {result.items.map((item) => (
                <li key={`${item.mediaType}-${item.id}`}>
                  <Link data-suggestion href={searchItemHref(item)} onClick={() => setOpen(false)}>
                    <span className={styles.thumbnail}>
                      {item.posterPath ? (
                        <Image
                          alt=""
                          height={54}
                          src={tmdbImageUrl("w92", item.posterPath)}
                          unoptimized
                          width={36}
                        />
                      ) : (
                        "◇"
                      )}
                    </span>
                    <span>
                      <b>{item.name}</b>
                      <small>
                        {{ person: "Person", movie: "Movie", tv: "TV show" }[item.mediaType]}
                        {item.mediaType !== "person" && item.year ? ` · ${item.year}` : ""}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            className={styles.allResults}
            href={`/search?q=${encodeURIComponent(term)}`}
            onClick={() => setOpen(false)}
          >
            See all results <span>Enter ↵</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function SearchBox() {
  const pathname = usePathname();
  const parameters = useSearchParams();
  const query = pathname === "/search" ? (parameters.get("q") ?? "") : "";

  return <SearchInput initialQuery={query} key={`${pathname}:${query}`} />;
}
