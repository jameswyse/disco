import Image from "next/image";

import { tmdbImageUrl } from "@/integrations/seerr/images";

import type { Availability, Title } from "./title";

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
  processing: { className: styles.requested, label: "Requested", symbol: "↓" },
  pending: { className: styles.pending, label: "Pending approval", symbol: "…" },
  "not-in-library": undefined,
} satisfies Record<Availability, AvailabilityBadge | undefined>;

const mediaTypeLabels = { movie: "Film", tv: "TV" } satisfies Record<Title["mediaType"], string>;

type TitleCardProperties = Readonly<{ title: Title; seerrOrigin: string }>;

export function TitleCard({ title, seerrOrigin }: TitleCardProperties) {
  const badge = availabilityBadges[title.availability];
  const detail = [
    title.rating === undefined ? undefined : `★ ${title.rating.toFixed(1)}`,
    title.year,
  ]
    .filter((part) => part !== undefined)
    .join(" · ");

  return (
    <li className={styles.card}>
      <a
        className={styles.link}
        href={`${seerrOrigin}/${title.mediaType}/${title.id}`}
        rel="noreferrer"
        target="_blank"
      >
        <div className={styles.poster}>
          {title.posterPath ? (
            <Image
              alt=""
              className={styles.posterImage}
              height={513}
              src={tmdbImageUrl("w342", title.posterPath)}
              unoptimized
              width={342}
            />
          ) : (
            <span className={styles.posterFallback}>{title.name}</span>
          )}
          <span className={title.mediaType === "tv" ? styles.tvBadge : styles.movieBadge}>
            {mediaTypeLabels[title.mediaType]}
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
          <div className={styles.title}>{title.name}</div>
          <div className={styles.meta}>{detail}</div>
          <div className={styles.genres}>{title.genres.slice(0, 2).join(" · ")}</div>
        </div>
      </a>
    </li>
  );
}
