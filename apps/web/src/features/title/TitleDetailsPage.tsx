import Image from "next/image";
import Link from "next/link";

import { TitleCard } from "@/features/browse/TitleCard";
import { withTitleFacts } from "@/features/browse/titleFacts";
import { ContentState } from "@/features/feedback/ContentState";
import { loadSettings } from "@/features/settings/loadSettings";
import { defaultPreviewMode } from "@/features/settings/settings";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import { RequestButton } from "./RequestButton";
import { requestTimeline } from "./requestTimeline";
import { SeasonEpisodes } from "./SeasonEpisodes";
import { WatchlistButton } from "./WatchlistButton";

import type { ReactNode } from "react";

import type { Availability } from "@/features/browse/title";

import type { TitleDetailsResult } from "./loadTitleDetails";
import type { TimelineStep } from "./requestTimeline";
import type { SeasonSummary, TitleDetails } from "./titleDetails";

import styles from "./TitleDetailsPage.module.css";

type TitleDetailsPageProperties = Readonly<{
  result: Exclude<TitleDetailsResult, Readonly<{ kind: "not-found" }>>;
}>;

const availabilityLabels = {
  available: "Available",
  "partially-available": "Partly Available",
  processing: "Requested · processing",
  pending: "Requested · awaiting approval",
  "not-in-library": undefined,
} satisfies Record<Availability, string | undefined>;

const pillClasses = {
  available: styles.pillAvailable,
  "partially-available": styles.pillAvailable,
  processing: styles.pillRequested,
  pending: styles.pillPending,
  "not-in-library": styles.pillNone,
} satisfies Record<Availability, string | undefined>;

function runtimeLabel(details: TitleDetails): string | undefined {
  if (details.mediaType === "movie") {
    return details.runtimeMinutes
      ? `${Math.floor(details.runtimeMinutes / 60)}h ${details.runtimeMinutes % 60}m`
      : undefined;
  }

  return details.runtimeMinutes ? `~${details.runtimeMinutes} min` : undefined;
}

function seriesLabel(details: TitleDetails): string | undefined {
  if (details.mediaType !== "tv") {
    return undefined;
  }

  if (details.seriesType === "Miniseries") {
    return "Limited series";
  }

  return details.seasonCount
    ? `${details.seasonCount} ${details.seasonCount === 1 ? "season" : "seasons"}`
    : "Series";
}

type MetaPart = Readonly<{ key: string; content: ReactNode }>;

function Meta({ details }: Readonly<{ details: TitleDetails }>) {
  const runtime = runtimeLabel(details);
  const genres = details.genres.slice(0, 3).join(" · ");
  const parts: MetaPart[] = [{ key: "kind", content: seriesLabel(details) ?? "Film" }];

  if (details.episodeCount) {
    parts.push({ key: "episodes", content: `${details.episodeCount} episodes` });
  }

  if (runtime !== undefined) {
    parts.push({ key: "runtime", content: runtime });
  }

  if (details.certification !== undefined) {
    parts.push({
      key: "certification",
      content: <span className={styles.certification}>{details.certification}</span>,
    });
  }

  if (genres !== "") {
    parts.push({ key: "genres", content: genres });
  }

  if (details.originalLanguage !== undefined) {
    parts.push({ key: "language", content: <b>{details.originalLanguage}</b> });
  }

  if (details.countries[0] !== undefined) {
    parts.push({ key: "country", content: details.countries[0] });
  }

  if (details.status !== undefined) {
    parts.push({ key: "status", content: details.status });
  }

  return (
    <p className={styles.meta}>
      {parts.map((part, index) => (
        <span className={styles.metaPart} key={part.key}>
          {index > 0 ? <span className={styles.metaDivider}>·</span> : null}
          {part.content}
        </span>
      ))}
    </p>
  );
}

function requestLabel(details: TitleDetails): string {
  if (details.mediaType === "movie") {
    return "↓ Request";
  }

  return details.availability === "partially-available"
    ? "↓ Request remaining seasons"
    : "↓ Request all seasons";
}

const stepMarkerClasses = {
  done: `${styles.stepMarker} ${styles.stepDone}`,
  active: `${styles.stepMarker} ${styles.stepActive}`,
  pending: styles.stepMarker,
} satisfies Record<TimelineStep["state"], string | undefined>;

const stepMarkerSymbols = { done: "✓", active: "↓", pending: "" } satisfies Record<
  TimelineStep["state"],
  string
>;

function PrimaryAction({ details }: Readonly<{ details: TitleDetails }>) {
  switch (details.availability) {
    case "available":
      return details.plexUrl ? (
        <a className={`${styles.button} ${styles.plexButton}`} href={details.plexUrl}>
          ▶ Watch
        </a>
      ) : (
        <span className={`${styles.button} ${styles.plexButton}`}>✓ Available</span>
      );
    case "processing":
    case "pending":
      return <span className={`${styles.button} ${styles.requestedButton}`}>✓ Requested</span>;
    case "partially-available":
    case "not-in-library":
      return (
        <RequestButton
          className={`${styles.button} ${styles.requestButton}`}
          id={details.id}
          label={requestLabel(details)}
          mediaType={details.mediaType}
          pendingClassName={`${styles.button} ${styles.requestedButton}`}
        />
      );

    default: {
      const unsupportedAvailability: never = details.availability;

      return unsupportedAvailability;
    }
  }
}

function Scores({ details }: Readonly<{ details: TitleDetails }>) {
  const { tmdb, rottenTomatoes, imdb } = details.scores;
  const cards = [
    tmdb
      ? {
          label: "TMDB",
          value: tmdb.score.toFixed(1),
          note: `${tmdb.votes.toLocaleString("en-AU")} votes`,
          good: false,
        }
      : undefined,
    rottenTomatoes?.critics !== undefined
      ? {
          label: "Rotten Tomatoes",
          value: `${rottenTomatoes.critics}%`,
          note: "critics",
          good: rottenTomatoes.critics >= 75,
        }
      : undefined,
    rottenTomatoes?.audience !== undefined
      ? { label: "RT audience", value: `${rottenTomatoes.audience}%`, note: undefined, good: false }
      : undefined,
    imdb
      ? {
          label: "IMDb",
          value: imdb.score.toFixed(1),
          note: imdb.votes ? imdb.votes.toLocaleString("en-AU") : undefined,
          good: false,
        }
      : undefined,
  ].filter((card) => card !== undefined);

  if (cards.length === 0) {
    return null;
  }

  return (
    <section aria-label="Scores" className={styles.section}>
      <ul className={styles.scores}>
        {cards.map((card) => (
          <li className={styles.score} key={card.label}>
            <small>{card.label}</small>
            <b className={card.good ? styles.good : undefined}>{card.value}</b>
            {card.note ? <em>{card.note}</em> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SeasonRow({
  season,
  details,
}: Readonly<{ season: SeasonSummary; details: TitleDetails }>) {
  const label = availabilityLabels[season.availability];

  return (
    <SeasonEpisodes
      id={details.id}
      season={season}
      status={
        label ? (
          <span className={`${styles.pill} ${pillClasses[season.availability]}`}>{label}</span>
        ) : (
          <RequestButton
            className={styles.seasonRequest}
            id={details.id}
            label="Request"
            mediaType="tv"
            pendingClassName={`${styles.pill} ${styles.pillRequested}`}
            season={season.number}
          />
        )
      }
    />
  );
}

export async function TitleDetailsPage({ result }: TitleDetailsPageProperties) {
  if (result.kind === "error") {
    return <ContentState title="Title couldn’t be loaded" message={result.message} retry />;
  }

  const { details, region, seerrOrigin } = result;
  const [related, settings] = await Promise.all([withTitleFacts(result.related), loadSettings()]);
  const previewMode = settings.previewMode ?? defaultPreviewMode;
  const timeline = requestTimeline(details);
  const statusLabel = availabilityLabels[details.availability];
  const facts = [
    ["Status", details.status],
    [
      details.mediaType === "movie" ? "Released" : "First aired",
      details.year ? String(details.year) : undefined,
    ],
    ["Network", details.networks.map((network) => network.name).join(" · ") || undefined],
    ["Production", details.companies.slice(0, 3).join(" · ") || undefined],
    ["Created by", details.creators.join(" · ") || undefined],
    ["Director", details.directors.join(" · ") || undefined],
    ["Original language", details.originalLanguage],
    ["Country", details.countries.join(" · ") || undefined],
  ].filter((fact): fact is [string, string] => fact[1] !== undefined);

  return (
    <article className={details.backdropPath ? undefined : styles.withoutBackdrop}>
      <Link className={styles.back} href="/">
        ← Back to browse
      </Link>
      {details.backdropPath ? (
        <div className={styles.hero}>
          <Image
            alt=""
            className={styles.heroImage}
            fill
            priority
            sizes="100vw"
            src={tmdbImageUrl("w1280", details.backdropPath)}
            unoptimized
          />
        </div>
      ) : null}
      <div className={styles.content}>
        <header className={styles.header}>
          {details.posterPath ? (
            <div className={styles.poster}>
              <Image
                alt=""
                className={styles.posterImage}
                height={315}
                src={tmdbImageUrl("w342", details.posterPath)}
                unoptimized
                width={210}
              />
              {statusLabel ? <span className={styles.posterStatus}>{statusLabel}</span> : null}
            </div>
          ) : null}
          <div className={styles.titleBlock}>
            {timeline.length > 0 ? (
              <p className={styles.status}>
                <span aria-hidden="true" className={styles.statusDot} />
                {timeline.find((step) => step.state === "active")?.label ?? timeline.at(-1)?.label}
                {timeline[0]?.detail ? ` · ${timeline[0].detail}` : ""}
              </p>
            ) : null}
            <h1 className={styles.heading}>
              {details.name}{" "}
              {details.year ? <small className={styles.year}>({details.year})</small> : null}
            </h1>
            {details.tagline ? <p className={styles.tagline}>{details.tagline}</p> : null}
            <Meta details={details} />
            <div className={styles.actions}>
              <PrimaryAction details={details} />
              {details.trailerUrl ? (
                <a
                  className={styles.button}
                  href={details.trailerUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  ▶ Play trailer
                </a>
              ) : null}
              <WatchlistButton
                className={`${styles.button} ${styles.ghostButton}`}
                id={details.id}
                mediaType={details.mediaType}
                onWatchlist={details.onWatchlist}
                title={details.name}
              />
              <a
                className={`${styles.button} ${styles.ghostButton}`}
                href={`${seerrOrigin}/${details.mediaType}/${details.id}`}
                rel="noreferrer"
                target="_blank"
              >
                Open in Seerr
              </a>
            </div>
          </div>
        </header>

        <div className={styles.columns}>
          <div className={styles.primary}>
            <Scores details={details} />

            {details.overview ? (
              <section className={styles.section}>
                <h2 className={styles.sectionHeading}>Overview</h2>
                <p className={styles.overview}>{details.overview}</p>
              </section>
            ) : null}

            {details.cast.length > 0 ? (
              <section className={styles.section}>
                <h2 className={styles.sectionHeading}>
                  Cast
                  <a
                    className={styles.sectionAction}
                    href={`https://www.themoviedb.org/${details.mediaType}/${details.id}/cast`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Full cast &amp; crew →
                  </a>
                </h2>
                <ul className={styles.cast}>
                  {details.cast.slice(0, 7).map((person) => (
                    <li className={styles.person} key={person.id}>
                      <Link className={styles.personLink} href={`/person/${person.id}`}>
                        {person.profilePath ? (
                          <Image
                            alt=""
                            className={styles.personPortrait}
                            height={120}
                            src={tmdbImageUrl("w185", person.profilePath)}
                            unoptimized
                            width={120}
                          />
                        ) : (
                          <span aria-hidden="true" className={styles.personPortraitFallback} />
                        )}
                        <span className={styles.personName}>{person.name}</span>
                        {person.role ? (
                          <span className={styles.personRole}>{person.role}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {details.seasons.length > 0 ? (
              <section className={styles.section}>
                <h2 className={styles.sectionHeading}>Seasons</h2>
                <ul className={styles.seasons}>
                  {details.seasons.map((season) => (
                    <SeasonRow details={details} key={season.number} season={season} />
                  ))}
                </ul>
              </section>
            ) : null}

            {related.length > 0 ? (
              <section className={styles.section}>
                <h2 className={styles.sectionHeading}>More like this</h2>
                <ul className={styles.related}>
                  {related.map((title) => (
                    <TitleCard
                      key={`${title.mediaType}-${title.id}`}
                      previewMode={previewMode}
                      title={title}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className={styles.side}>
            {timeline.length > 0 ? (
              <section className={styles.panel}>
                <h2 className={styles.panelHeading}>
                  Request status{" "}
                  <small>via Seerr → {details.mediaType === "movie" ? "Radarr" : "Sonarr"}</small>
                </h2>
                <ol className={styles.steps}>
                  {timeline.map((step) => (
                    <li className={styles.step} key={step.id}>
                      <span aria-hidden="true" className={stepMarkerClasses[step.state]}>
                        {stepMarkerSymbols[step.state]}
                      </span>
                      <span>
                        <b>{step.label}</b>
                        {step.detail ? <small>{step.detail}</small> : null}
                      </span>
                    </li>
                  ))}
                </ol>
                {details.requests
                  .filter((request) => request.qualityProfile)
                  .map((request) => (
                    <p className={styles.qualityProfile} key={request.id}>
                      Quality profile · <b>{request.qualityProfile}</b>
                      {request.seasons.length > 0 ? ` · Seasons ${request.seasons.join(", ")}` : ""}
                    </p>
                  ))}
              </section>
            ) : null}

            {details.streamingOn.length > 0 || details.plexUrl ? (
              <section className={styles.panel}>
                <h2 className={styles.panelHeading}>
                  Where to watch <small>{region}</small>
                </h2>
                <ul className={styles.watchList}>
                  {details.streamingOn.map((provider) => (
                    <li className={styles.watch} key={provider.id}>
                      <span className={styles.watchProvider}>
                        {provider.logoPath ? (
                          <Image
                            alt=""
                            className={styles.watchLogo}
                            height={26}
                            src={tmdbImageUrl("w92", provider.logoPath)}
                            unoptimized
                            width={26}
                          />
                        ) : null}
                        {provider.name}
                      </span>
                      <span className={styles.watchKind}>Subscription</span>
                    </li>
                  ))}
                  {details.plexUrl ? (
                    <li className={styles.watch}>
                      <span className={styles.watchProvider}>
                        <span aria-hidden="true" className={styles.plexLogo} />
                        Plex
                      </span>
                      <a className={styles.watchKind} href={details.plexUrl}>
                        Open →
                      </a>
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}

            {facts.length > 0 ? (
              <section className={styles.panel}>
                <h2 className={styles.panelHeading}>Details</h2>
                <dl className={styles.facts}>
                  {facts.map(([label, value]) => (
                    <div className={styles.fact} key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {details.keywords.length > 0 ? (
              <section className={styles.panel}>
                <h2 className={styles.panelHeading}>Keywords</h2>
                <ul className={styles.chips}>
                  {details.keywords.slice(0, 12).map((keyword) => (
                    <li key={keyword}>{keyword}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={styles.panel}>
              <h2 className={styles.panelHeading}>External</h2>
              <ul className={styles.chips}>
                {details.externalLinks.map((link) => (
                  <li key={link.label}>
                    <a href={link.url} rel="noreferrer" target="_blank">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </article>
  );
}
