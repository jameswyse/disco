import Link from "next/link";

import { mediaTypeLabel } from "./placeholderTitles";

import type { Availability, PlaceholderTitle } from "./placeholderTitles";

import styles from "./TitleCard.module.css";

// CSS module classes are `string | undefined` under `noUncheckedIndexedAccess`.
type AvailabilityBadge = Readonly<{ className: string | undefined; label: string; symbol: string }>;

const availabilityBadges = {
  available: { className: styles.available, label: "In Plex", symbol: "✓" },
  "partially-available": {
    className: styles.partiallyAvailable,
    label: "Partly in Plex",
    symbol: "◐",
  },
  requested: { className: styles.requested, label: "Requested", symbol: "↓" },
  pending: { className: styles.pending, label: "Pending approval", symbol: "…" },
  "not-in-library": undefined,
} satisfies Record<Availability["kind"], AvailabilityBadge | undefined>;

export function TitleCard({ title }: Readonly<{ title: PlaceholderTitle }>) {
  const badge = availabilityBadges[title.availability.kind];

  return (
    <li className={styles.card}>
      <Link className={styles.link} href={`/title/${title.mediaType}/${title.id}`}>
        <div className={styles.poster} style={{ background: title.tone }}>
          <span className={title.mediaType === "tv" ? styles.tvBadge : styles.movieBadge}>
            {mediaTypeLabel(title.mediaType)}
          </span>
          {badge ? (
            <span
              aria-label={badge.label}
              className={`${styles.statusBadge} ${badge.className}`}
              role="img"
            >
              {badge.symbol}
            </span>
          ) : null}
        </div>
        <div className={styles.caption}>
          <div className={styles.title}>{title.title}</div>
          <div className={styles.meta}>
            <span className={styles.rating}>★ {title.rating.toFixed(1)}</span>
            <span>
              {title.detail} · {title.year}
            </span>
          </div>
          <div className={styles.genres}>{title.genres.join(" · ")}</div>
        </div>
      </Link>
    </li>
  );
}
