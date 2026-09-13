import Link from "next/link";

import { mediaTypeLabel } from "@/features/browse/placeholderTitles";

import type { PlaceholderTitle } from "@/features/browse/placeholderTitles";

import styles from "./TitleDetailsPage.module.css";

type TitleDetailsPageProperties = Readonly<{ title: PlaceholderTitle }>;

const scoreSources = ["TMDB", "Rotten Tomatoes", "RT audience", "IMDb", "Trakt"] as const;
const castPlaceholders = [1, 2, 3, 4, 5, 6, 7] as const;
const requestSteps = [
  "Requested",
  "Searching indexers",
  "Downloading",
  "Available in Plex",
] as const;
const factLabels = [
  "Status",
  "First aired",
  "Network",
  "Production",
  "Created by",
  "Original language",
] as const;

export function TitleDetailsPage({ title }: TitleDetailsPageProperties) {
  return (
    <article>
      <Link className={styles.back} href="/">
        ← Netflix <b>› Trending</b>
      </Link>
      <div className={styles.hero} style={{ background: title.tone }} />
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.poster} style={{ background: title.tone }}>
            <span className={styles.posterStatus}>{mediaTypeLabel(title.mediaType)}</span>
          </div>
          <div className={styles.titleBlock}>
            <p className={styles.status}>
              <span aria-hidden="true" className={styles.statusDot} />
              Request status appears here once Seerr is connected
            </p>
            <h1 className={styles.heading}>
              {title.title} <small className={styles.year}>({title.year})</small>
            </h1>
            <p className={styles.tagline}>Tagline placeholder.</p>
            <p className={styles.meta}>
              <b>{title.detail}</b>
              <span className={styles.metaDivider}>·</span>
              {title.genres.join(" · ")}
              <span className={styles.metaDivider}>·</span>
              <span className={styles.certification}>Rating</span>
              <span className={styles.metaDivider}>·</span>
              <b>Language</b>
            </p>
            <div className={styles.actions}>
              <button className={`${styles.button} ${styles.requestButton}`} disabled type="button">
                ↓ Request
              </button>
              <button className={styles.button} disabled type="button">
                ▶ Play trailer
              </button>
              <button className={`${styles.button} ${styles.ghostButton}`} disabled type="button">
                ＋ Watchlist
              </button>
              <span className={styles.actionNote}>
                Will appear in Plex automatically when downloaded.
              </span>
            </div>
          </div>
        </header>

        <div className={styles.columns}>
          <div>
            <section aria-label="Scores" className={styles.section}>
              <ul className={styles.scores}>
                {scoreSources.map((source) => (
                  <li className={styles.score} key={source}>
                    <small>{source}</small>
                    <b>—</b>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Overview</h2>
              <p className={styles.overview}>
                The overview for {title.title} loads from Seerr once the integration is connected.
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>
                Cast <span className={styles.sectionAction}>Full cast &amp; crew →</span>
              </h2>
              <ul className={styles.cast}>
                {castPlaceholders.map((index) => (
                  <li className={styles.person} key={index}>
                    <span aria-hidden="true" className={styles.personPortrait} />
                    <span className={styles.personName}>Cast member</span>
                    <span className={styles.personRole}>Character</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className={styles.side}>
            <section className={styles.panel}>
              <h2 className={styles.panelHeading}>
                Request status <small>via Seerr</small>
              </h2>
              <ol className={styles.steps}>
                {requestSteps.map((step) => (
                  <li className={styles.step} key={step}>
                    <span aria-hidden="true" className={styles.stepMarker} />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelHeading}>
                Where to watch <small>AU</small>
              </h2>
              <p className={styles.panelPlaceholder}>Providers load from Seerr.</p>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelHeading}>Details</h2>
              <dl className={styles.facts}>
                {factLabels.map((label) => (
                  <div className={styles.fact} key={label}>
                    <dt>{label}</dt>
                    <dd>—</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </article>
  );
}
