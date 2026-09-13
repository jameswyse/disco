"use client";

import Image from "next/image";
import Link from "next/link";

import { useEffect, useRef, useState } from "react";

import { decodeTitlePreview } from "@/features/title/titlePreview";
import { titleHref } from "@/features/title/titleRoute";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import { TitleHoverCard } from "./TitleHoverCard";

import type { PreviewMode } from "@/features/settings/settings";

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

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "★ 8.0 · S3 · 2025" for series, "★ 7.1 · 2026 · 1h 55m" for films. */
function captionDetail(title: Title): string {
  const parts: string[] = [];

  if (title.rating !== undefined) {
    parts.push(`★ ${title.rating.toFixed(1)}`);
  }

  if (title.mediaType === "tv" && title.seasonCount !== undefined) {
    parts.push(title.seasonCount === 1 ? "S1" : `${title.seasonCount} seasons`);
  }

  if (title.year !== undefined) {
    parts.push(String(title.year));
  }

  if (title.mediaType === "movie" && title.runtimeMinutes) {
    parts.push(formatRuntime(title.runtimeMinutes));
  }

  return parts.join(" · ");
}

/** Delay before a hover opens the preview, so scanning the grid does not flash cards. */
const hoverDelayMs = 350;
/** Preview card width plus its gap, used to decide which side has room. */
const previewFootprint = 400;

type TitleCardProperties = Readonly<{ title: Title; previewMode: PreviewMode }>;

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

export function TitleCard({ title, previewMode }: TitleCardProperties) {
  const badge = availabilityBadges[title.availability];
  const detail = captionDetail(title);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "left">("right");
  const [preview, setPreview] = useState<PreviewState>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const card = useRef<HTMLLIElement>(null);

  const show = () => {
    const bounds = card.current?.getBoundingClientRect();

    if (bounds) {
      setSide(bounds.right + previewFootprint > window.innerWidth ? "left" : "right");
    }

    setOpen(true);

    if (preview.kind === "idle") {
      setPreview({ kind: "loading" });
      void fetchPreview(title).then(setPreview);
    }
  };

  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  const hoverHandlers =
    previewMode === "hover"
      ? {
          onMouseEnter: () => {
            clearTimeout(timer.current);
            timer.current = setTimeout(show, hoverDelayMs);
          },
          onMouseLeave: hide,
        }
      : {};

  // In button mode the card stays open until dismissed, so close on Escape or an outside click.
  useEffect(() => {
    if (previewMode !== "button" || !open) {
      return undefined;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePointer(event: PointerEvent) {
      if (event.target instanceof Node && !card.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [previewMode, open]);

  return (
    <li className={open ? `${styles.card} ${styles.open}` : styles.card} ref={card}>
      {/* The hover area spans the card and its preview so the pointer can move between them. */}
      <div className={styles.hoverArea} {...hoverHandlers}>
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
        {previewMode === "button" ? (
          <button
            aria-expanded={open}
            aria-label={`Quick info for ${title.name}`}
            className={styles.infoButton}
            onClick={() => (open ? hide() : show())}
            type="button"
          >
            i
          </button>
        ) : null}
        {open ? (
          <TitleHoverCard onClose={hide} preview={preview} side={side} title={title} />
        ) : null}
      </div>
    </li>
  );
}
