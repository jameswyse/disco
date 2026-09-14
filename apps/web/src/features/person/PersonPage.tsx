import Image from "next/image";
import Link from "next/link";

import { TitleGrid } from "@/features/browse/TitleGrid";
import { loadSettings } from "@/features/settings/loadSettings";
import { defaultPreviewMode } from "@/features/settings/settings";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import { Filmography } from "./Filmography";

import type { loadPerson } from "./loadPerson";

import styles from "./PersonPage.module.css";

export async function PersonPage({
  result,
}: Readonly<{ result: Extract<Awaited<ReturnType<typeof loadPerson>>, { kind: "ok" }> }>) {
  const { person, titles } = result;
  const settings = await loadSettings();
  const facts = [
    ["Known for", person.knownForDepartment],
    ["Born", person.birthday],
    ["Died", person.deathday],
    ["Place of birth", person.placeOfBirth],
    ["Also known as", person.alsoKnownAs?.join(" · ")],
  ];

  return (
    <article className={styles.page}>
      <Link className={styles.back} href="/">
        ← Back to browse
      </Link>
      <div className={styles.columns}>
        <div className={styles.profile}>
          <div className={styles.portrait}>
            {person.profilePath ? (
              <Image
                alt={person.name}
                height={420}
                priority
                src={tmdbImageUrl("w342", person.profilePath)}
                unoptimized
                width={280}
              />
            ) : (
              <svg aria-hidden="true" fill="none" viewBox="0 0 120 160">
                <circle cx="60" cy="54" r="24" />
                <path d="M16 144v-16a44 44 0 0 1 88 0v16" />
              </svg>
            )}
          </div>
          <aside className={styles.personal}>
            <h2>Personal information</h2>
            <dl>
              {facts.map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            <a
              href={`https://www.themoviedb.org/person/${person.id}`}
              rel="noreferrer"
              target="_blank"
            >
              TMDB ↗
            </a>
            {person.imdbId ? (
              <a
                href={`https://www.imdb.com/name/${person.imdbId}`}
                rel="noreferrer"
                target="_blank"
              >
                IMDb ↗
              </a>
            ) : null}
          </aside>
        </div>
        <header className={styles.header}>
          <div className={styles.identity}>
            <p className={styles.eyebrow}>{person.knownForDepartment || "Person"}</p>
            <h1>{person.name}</h1>
          </div>
          <section className={styles.biographySection}>
            <h2>Biography</h2>
            <p className={styles.biography}>
              {person.biography || "No biography is available yet."}
            </p>
          </section>
        </header>
      </div>
      <div className={styles.credits}>
        {titles.length > 0 ? (
          <section>
            <h2>Known for</h2>
            <TitleGrid
              label="Known for"
              previewMode={settings.previewMode ?? defaultPreviewMode}
              titles={[...titles].sort((a, b) => b.popularity - a.popularity).slice(0, 6)}
            />
          </section>
        ) : null}
        <Filmography titles={titles} previewMode={settings.previewMode ?? defaultPreviewMode} />
      </div>
    </article>
  );
}
