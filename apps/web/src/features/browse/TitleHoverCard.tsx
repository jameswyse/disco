"use client";

import Image from "next/image";
import Link from "next/link";

import { RequestButton } from "@/features/title/RequestButton";
import { titleHref } from "@/features/title/titleRoute";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import type { TitlePreview } from "@/features/title/titlePreview";

import type { Title } from "./title";

import styles from "./TitleHoverCard.module.css";

export type PreviewState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; preview: TitlePreview }>
  | Readonly<{ kind: "error" }>;

type TitleHoverCardProperties = Readonly<{
  title: Title;
  preview: PreviewState;
  side: "right" | "left";
}>;

const availabilityLabels = {
  available: "In Plex",
  "partially-available": "Partly in Plex",
  processing: "Requested",
  pending: "Pending approval",
  "not-in-library": "Not in Plex",
} satisfies Record<Title["availability"], string>;

function runtimeLabel(details: TitlePreview, mediaType: Title["mediaType"]): string | undefined {
  if (mediaType === "movie") {
    return details.runtimeMinutes
      ? `${Math.floor(details.runtimeMinutes / 60)}h ${details.runtimeMinutes % 60}m`
      : undefined;
  }

  const episodes = details.episodeCount ? `${details.episodeCount} episodes` : undefined;
  const runtime = details.runtimeMinutes ? `× ${details.runtimeMinutes}m` : undefined;

  return [episodes, runtime].filter(Boolean).join(" ") || undefined;
}

function Scores({ details }: Readonly<{ details: TitlePreview }>) {
  const { tmdb, rottenTomatoes, imdb } = details.scores;
  const items = [
    tmdb === undefined ? undefined : { label: "TMDB", value: tmdb.toFixed(1), good: tmdb >= 7.5 },
    rottenTomatoes === undefined
      ? undefined
      : { label: "RT", value: `${rottenTomatoes}%`, good: rottenTomatoes >= 75 },
    imdb === undefined ? undefined : { label: "IMDb", value: imdb.toFixed(1), good: imdb >= 7.5 },
  ].filter((item) => item !== undefined);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.scores}>
      {items.map((item) => (
        <span key={item.label}>
          {item.label} <b className={item.good ? styles.good : undefined}>{item.value}</b>
        </span>
      ))}
    </div>
  );
}

export function TitleHoverCard({ title, preview, side }: TitleHoverCardProperties) {
  const details = preview.kind === "ready" ? preview.preview : undefined;
  const meta = details
    ? [
        details.year,
        runtimeLabel(details, title.mediaType),
        details.certification,
        details.originalLanguage,
        details.country,
      ]
        .filter((part) => part !== undefined)
        .join(" · ")
    : [title.year].filter((part) => part !== undefined).join(" · ");
  const canRequest = title.availability === "not-in-library";

  return (
    <div className={side === "left" ? `${styles.card} ${styles.left}` : styles.card} role="dialog">
      <div className={styles.backdrop}>
        {(details?.backdropPath ?? title.backdropPath) ? (
          <Image
            alt=""
            className={styles.backdropImage}
            fill
            sizes="360px"
            src={tmdbImageUrl("w780", details?.backdropPath ?? title.backdropPath ?? "")}
            unoptimized
          />
        ) : null}
        <span className={title.mediaType === "tv" ? styles.tvBadge : styles.movieBadge}>
          {title.mediaType === "tv" ? "TV" : "Film"}
          {details?.seriesType === "Miniseries" ? " · Limited" : ""}
        </span>
        <span className={styles.availability}>{availabilityLabels[title.availability]}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.name}>{title.name}</div>
        <div className={styles.meta}>{meta}</div>
        {details ? <Scores details={details} /> : null}
        <div className={styles.genres}>
          {(details?.genres ?? title.genres).slice(0, 4).map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
        <p className={styles.overview}>
          {preview.kind === "loading" ? "Loading…" : (details?.overview ?? title.overview)}
        </p>
        {details && details.cast.length > 0 ? (
          <div className={styles.cast}>
            {details.cast.map((person) => (
              <span key={person.id}>
                {person.profilePath ? (
                  <Image
                    alt=""
                    height={22}
                    src={tmdbImageUrl("w185", person.profilePath)}
                    unoptimized
                    width={22}
                  />
                ) : (
                  <i aria-hidden="true" />
                )}
                {person.name}
              </span>
            ))}
          </div>
        ) : null}
        {details && details.credits.length > 0 ? (
          <div className={styles.credits}>
            {details.credits.join(" · ")}
            {details.creators.length > 0 ? (
              <>
                {" · Created by "}
                <b>{details.creators.join(", ")}</b>
              </>
            ) : null}
            {details.creators.length === 0 && details.directors.length > 0 ? (
              <>
                {" · Directed by "}
                <b>{details.directors.join(", ")}</b>
              </>
            ) : null}
          </div>
        ) : null}
        <div className={styles.actions}>
          {canRequest ? (
            <RequestButton
              className={`${styles.action} ${styles.request}`}
              id={title.id}
              label="↓ Request"
              mediaType={title.mediaType}
              pendingClassName={`${styles.action} ${styles.request}`}
            />
          ) : null}
          <Link className={styles.action} href={titleHref(title.mediaType, title.id)}>
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
