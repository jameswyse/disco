"use client";

import Image from "next/image";
import Link from "next/link";

import { useRef, useState } from "react";

import { decodeTitlePreview } from "@/features/title/titlePreview";
import { titleHref } from "@/features/title/titleRoute";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import { TitleHoverCard } from "./TitleHoverCard";

import type { Availability, Title } from "./title";
import type { PreviewState } from "./TitleHoverCard";

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

/** Delay before a hover opens the preview, so scanning the grid does not flash cards. */
const hoverDelayMs = 350;

type TitleCardProperties = Readonly<{ title: Title }>;

async function fetchPreview(title: Title): Promise<PreviewState> {
  try {
    const response = await fetch(`/api/titles/${title.mediaType}/${title.id}`);

    if (!response.ok) {
      return { kind: "error" };
    }

    const body: unknown = await response.json();
    const decoded = decodeTitlePreview(body);

    return decoded._tag === "Right" ? { kind: "ready", preview: decoded.right } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

export function TitleCard({ title }: TitleCardProperties) {
  const badge = availabilityBadges[title.availability];
  const detail = [
    title.rating === undefined ? undefined : `★ ${title.rating.toFixed(1)}`,
    title.year,
  ]
    .filter((part) => part !== undefined)
    .join(" · ");
  const [hovered, setHovered] = useState(false);
  const [side, setSide] = useState<"right" | "left">("right");
  const [preview, setPreview] = useState<PreviewState>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const card = useRef<HTMLLIElement>(null);

  const open = () => {
    const bounds = card.current?.getBoundingClientRect();

    if (bounds) {
      setSide(bounds.right + 400 > window.innerWidth ? "left" : "right");
    }

    setHovered(true);

    if (preview.kind === "idle") {
      setPreview({ kind: "loading" });
      void fetchPreview(title).then(setPreview);
    }
  };

  const scheduleOpen = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(open, hoverDelayMs);
  };

  const close = () => {
    clearTimeout(timer.current);
    setHovered(false);
  };

  return (
    <li className={hovered ? `${styles.card} ${styles.hovered}` : styles.card} ref={card}>
      {/* The hover area spans the card and its preview so the pointer can move between them. */}
      <div className={styles.hoverArea} onMouseEnter={scheduleOpen} onMouseLeave={close}>
        <Link className={styles.link} href={titleHref(title.mediaType, title.id)}>
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
              <span aria-hidden="true" className={styles.posterFallback}>
                {title.name}
              </span>
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
        </Link>
        {hovered ? <TitleHoverCard preview={preview} side={side} title={title} /> : null}
      </div>
    </li>
  );
}
