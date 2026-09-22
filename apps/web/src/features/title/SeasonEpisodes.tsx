"use client";

import Image from "next/image";

import { startTransition, useActionState, useId, useState } from "react";

import { DiscoLoader } from "@/features/feedback/DiscoLoader";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import { loadSeasonEpisodes } from "./loadSeasonEpisodes";

import type { ReactNode } from "react";

import type { SeasonSummary } from "./titleDetails";

import styles from "./SeasonEpisodes.module.css";

function formatDate(iso: string | null | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }

  const date = new Date(`${iso}T00:00:00Z`);

  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}

export function SeasonEpisodes({
  id,
  season,
  status,
}: Readonly<{ id: number; season: SeasonSummary; status: ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [result, load, pending] = useActionState(loadSeasonEpisodes, undefined);
  const panelId = useId();

  function fetchEpisodes() {
    startTransition(() => load({ id, season: season.number }));
  }

  function toggle() {
    setOpen(!open);

    if (!open && result === undefined && !pending) {
      fetchEpisodes();
    }
  }

  return (
    <li className={styles.season}>
      <div className={styles.header}>
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className={styles.toggle}
          onClick={toggle}
          type="button"
        >
          <span className={styles.name}>{season.name}</span>
          <span className={styles.count}>
            {season.episodeCount} {season.episodeCount === 1 ? "episode" : "episodes"}
            {season.airDateLabel ? ` · ${season.airDateLabel}` : ""}
            {season.availabilityDetail ? ` · ${season.availabilityDetail}` : ""}
          </span>
          <svg aria-hidden="true" className={styles.chevron} viewBox="0 0 20 20">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>
        <div className={styles.status}>{status}</div>
      </div>
      <div className={styles.panel} hidden={!open} id={panelId}>
        {pending ? <DiscoLoader label="Loading episodes" size="inline" /> : null}
        {pending ? (
          <div aria-hidden="true" className={styles.loadingEpisode}>
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {!pending && result?.kind === "error" ? (
          <div className={styles.message}>
            <p role="alert">{result.message}</p>
            <button className={styles.retry} onClick={fetchEpisodes} type="button">
              Try again
            </button>
          </div>
        ) : null}
        {result?.kind === "ok" ? (
          result.episodes.length === 0 ? (
            <p className={styles.message}>No episode information is available yet.</p>
          ) : (
            <ol aria-label={`${season.name} episodes`} className={styles.episodes}>
              {result.episodes.map((episode) => (
                <li className={styles.episode} key={episode.id}>
                  <div>
                    <div className={styles.episodeHeading}>
                      <h3>
                        {episode.episodeNumber} - {episode.name}
                      </h3>
                      {episode.airDate ? (
                        <time className={styles.date} dateTime={episode.airDate}>
                          {formatDate(episode.airDate)}
                        </time>
                      ) : null}
                    </div>
                    {episode.overview ? (
                      <p className={styles.overview}>{episode.overview}</p>
                    ) : null}
                  </div>
                  {episode.stillPath ? (
                    <Image
                      alt=""
                      className={styles.still}
                      height={180}
                      src={tmdbImageUrl("w500", episode.stillPath)}
                      unoptimized
                      width={320}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          )
        ) : null}
      </div>
    </li>
  );
}
