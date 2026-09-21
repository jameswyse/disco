"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useRef } from "react";

import { browseHref } from "./browseHref";
import { anyLanguage, ratingOptions, sortOptions, voteOptions } from "./filters";

import type { Genre } from "@/integrations/seerr/schemas";

import type { BrowseLocation } from "./browseHref";
import type { BrowseFilters, MediaFilter } from "./filters";

import styles from "./FilterMenu.module.css";

/** Original-language choices; the full TMDB list is far too long for a dropdown. */
const languageOptions: readonly Readonly<{ code: string; label: string }>[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "pt", label: "Portuguese" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
  { code: "nl", label: "Dutch" },
  { code: "tr", label: "Turkish" },
];

const mediaFilters: readonly Readonly<{ id: MediaFilter; label: string }>[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV" },
];

type FilterMenuProperties = Readonly<{
  location: BrowseLocation;
  genres: readonly Genre[];
  /** Whether the view can show both films and series. */
  mixedMedia: boolean;
  lockedGenre?: string | undefined;
  lockedLanguage?: string | undefined;
}>;

export function FilterMenu({
  location,
  genres,
  mixedMedia,
  lockedGenre,
  lockedLanguage,
}: FilterMenuProperties) {
  const router = useRouter();
  const { filters } = location;
  const canSort = !mixedMedia || filters.mediaType !== "all";
  const disclosure = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const activeCount = [
    filters.mediaType !== "all",
    !lockedGenre && filters.genreId !== undefined,
    !lockedLanguage && filters.language !== undefined,
    filters.ratingAtLeast !== undefined,
    filters.hideAvailable,
    filters.hideRequested,
    filters.year !== undefined,
    filters.sort !== undefined,
    filters.votesAtLeast !== undefined,
  ].filter(Boolean).length;

  useEffect(() => {
    function dismiss(event: PointerEvent | FocusEvent) {
      if (
        event.target instanceof Node &&
        !disclosure.current?.contains(event.target) &&
        disclosure.current
      ) {
        disclosure.current.open = false;
      }
    }

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && disclosure.current?.open) {
        disclosure.current.open = false;
        trigger.current?.focus();
      }
    }

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const navigate = (next: Partial<BrowseFilters>) => {
    router.push(browseHref({ ...location, filters: { ...filters, ...next }, page: 1 }), {
      scroll: false,
    });
  };

  return (
    <details className={styles.filters} ref={disclosure}>
      <summary className={styles.trigger} ref={trigger}>
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M3 5h14M5 10h10M7 15h6" />
        </svg>
        Filters <span className={styles.count}>{activeCount}</span>
      </summary>
      {/* Keep padding clicks focused inside the disclosure when an input blurs. */}
      <div aria-label="Filters" className={styles.panel} role="group" tabIndex={-1}>
        {mixedMedia ? (
          <nav aria-label="Media type" className={styles.segmentedControl}>
            {mediaFilters.map((filter) => (
              <Link
                aria-current={filter.id === filters.mediaType ? "true" : undefined}
                className={styles.segment}
                href={browseHref({
                  ...location,
                  filters: { ...filters, mediaType: filter.id },
                  page: 1,
                })}
                scroll={false}
                key={filter.id}
              >
                {filter.label}
              </Link>
            ))}
          </nav>
        ) : null}
        {lockedGenre ? (
          <p className={styles.locked}>
            Genre · {lockedGenre} <span>Fixed by this view</span>
          </p>
        ) : (
          <label className={styles.field}>
            Genre
            <select
              aria-label="Genre"
              className={styles.dropdown}
              onChange={(event) =>
                navigate({
                  genreId: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
              value={filters.genreId ?? ""}
            >
              <option value="">Any genre</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {lockedLanguage ? (
          <p className={styles.locked}>
            Language · {lockedLanguage} <span>Fixed by this view</span>
          </p>
        ) : (
          <label className={styles.field}>
            Language
            <select
              aria-label="Language"
              className={styles.dropdown}
              onChange={(event) =>
                navigate({
                  language: event.target.value === anyLanguage ? undefined : event.target.value,
                })
              }
              value={filters.language ?? anyLanguage}
            >
              <option value={anyLanguage}>Any language</option>
              {languageOptions.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                  {language.code === location.defaultLanguage ? " (default)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={styles.field}>
          Rating
          <select
            aria-label="Rating"
            className={styles.dropdown}
            onChange={(event) =>
              navigate({
                ratingAtLeast: event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
            value={filters.ratingAtLeast ?? ""}
          >
            <option value="">Any rating</option>
            {ratingOptions.map((rating) => (
              <option key={rating} value={rating}>
                ★ {rating}+
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Sort order
          {!canSort ? <small>Choose Movies or TV to change the sort order.</small> : null}
          <select
            aria-label="Sort order"
            disabled={!canSort}
            className={styles.dropdown}
            value={filters.sort ?? ""}
            onChange={(event) =>
              navigate({ sort: sortOptions.find((option) => option.id === event.target.value)?.id })
            }
          >
            <option value="">Default for this list</option>
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Release year
          <input
            aria-label="Release year"
            className={styles.dropdown}
            defaultValue={filters.year ?? ""}
            key={filters.year ?? "any-year"}
            inputMode="numeric"
            type="number"
            min={1870}
            max={2100}
            placeholder="Any year"
            onBlur={(event) => {
              if (
                event.target.validity.valid &&
                event.target.value !== String(filters.year ?? "")
              ) {
                navigate({ year: event.target.value ? Number(event.target.value) : undefined });
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <label className={styles.field}>
          Minimum votes
          <select
            aria-label="Minimum votes"
            className={styles.dropdown}
            value={filters.votesAtLeast ?? ""}
            onChange={(event) =>
              navigate({
                votesAtLeast: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          >
            <option value="">Any vote count</option>
            {voteOptions.map((votes) => (
              <option key={votes} value={votes}>
                {votes.toLocaleString("en-AU")}+
              </option>
            ))}
          </select>
        </label>
        <label className={styles.toggle}>
          Hide already available
          <input
            checked={filters.hideAvailable}
            className={styles.toggleInput}
            onChange={(event) => navigate({ hideAvailable: event.target.checked })}
            type="checkbox"
          />
          <span aria-hidden="true" className={styles.toggleTrack} />
        </label>
        <label className={styles.toggle}>
          Hide already requested
          <input
            checked={filters.hideRequested}
            className={styles.toggleInput}
            onChange={(event) => navigate({ hideRequested: event.target.checked })}
            type="checkbox"
          />
          <span aria-hidden="true" className={styles.toggleTrack} />
        </label>
      </div>
    </details>
  );
}
