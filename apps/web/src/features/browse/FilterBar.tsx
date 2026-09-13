"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { browseHref } from "./browseHref";
import { ratingOptions } from "./filters";

import type { Genre } from "@/integrations/seerr/schemas";

import type { BrowseLocation } from "./browseHref";
import type { BrowseFilters, MediaFilter } from "./filters";

import styles from "./BrowsePage.module.css";

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

type FilterBarProperties = Readonly<{
  location: BrowseLocation;
  genres: readonly Genre[];
  /** Whether the view can show both films and series. */
  mixedMedia: boolean;
}>;

export function FilterBar({ location, genres, mixedMedia }: FilterBarProperties) {
  const router = useRouter();
  const { filters } = location;

  const navigate = (next: Partial<BrowseFilters>) => {
    router.push(browseHref({ ...location, filters: { ...filters, ...next }, page: 1 }));
  };

  return (
    <div className={styles.filters}>
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
              key={filter.id}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <select
        aria-label="Genre"
        className={styles.dropdown}
        onChange={(event) =>
          navigate({ genreId: event.target.value === "" ? undefined : Number(event.target.value) })
        }
        value={filters.genreId ?? ""}
      >
        <option value="">Genre</option>
        {genres.map((genre) => (
          <option key={genre.id} value={genre.id}>
            {genre.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Language"
        className={styles.dropdown}
        onChange={(event) =>
          navigate({ language: event.target.value === "" ? undefined : event.target.value })
        }
        value={filters.language ?? ""}
      >
        <option value="">Language</option>
        {languageOptions.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
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
        <option value="">Rating</option>
        {ratingOptions.map((rating) => (
          <option key={rating} value={rating}>
            ★ {rating}+
          </option>
        ))}
      </select>
      <label className={styles.toggle}>
        Hide what's already in Plex
        <input
          checked={filters.hideAvailable}
          className={styles.toggleInput}
          onChange={(event) => navigate({ hideAvailable: event.target.checked })}
          type="checkbox"
        />
        <span aria-hidden="true" className={styles.toggleTrack} />
      </label>
    </div>
  );
}
