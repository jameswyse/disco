import Image from "next/image";
import Link from "next/link";

import { PreferencesForm } from "@/features/settings/PreferencesForm";
import { tmdbImageUrl, tmdbWordmarkUrl } from "@/integrations/seerr/images";

import { addView, moveView, removeView } from "./actions";
import { libraryCategories, loadLibraryPage } from "./loadLibraryPage";
import { viewArtwork } from "./viewArtwork";
import { sameSource } from "./views";

import type { LibraryEntry } from "./library";
import type { LibraryCategory } from "./loadLibraryPage";
import type { MutableView, View } from "./views";

import styles from "./ViewLibraryPage.module.css";

type ViewLibraryPageProperties = Readonly<{ category: LibraryCategory; query: string }>;

function libraryHref(category: LibraryCategory, query: string): `/views${string}` {
  const parameters = new URLSearchParams();

  if (category !== "all") {
    parameters.set("category", category);
  }

  if (query !== "") {
    parameters.set("q", query);
  }

  const encoded = parameters.toString();

  return encoded === "" ? "/views" : `/views?${encoded}`;
}

function SidebarItem({
  view,
  index,
  count,
}: Readonly<{ view: View; index: number; count: number }>) {
  return (
    <li className={styles.item}>
      <span className={styles.itemLabel}>{view.label}</span>
      <form action={moveView} className={styles.itemActions}>
        <input name="id" type="hidden" value={view.id} />
        <button
          aria-label={`Move ${view.label} up`}
          className={styles.iconButton}
          disabled={index === 0}
          name="direction"
          type="submit"
          value="up"
        >
          ↑
        </button>
        <button
          aria-label={`Move ${view.label} down`}
          className={styles.iconButton}
          disabled={index === count - 1}
          name="direction"
          type="submit"
          value="down"
        >
          ↓
        </button>
      </form>
      <form action={removeView}>
        <input name="id" type="hidden" value={view.id} />
        <button aria-label={`Remove ${view.label}`} className={styles.iconButton} type="submit">
          ✕
        </button>
      </form>
    </li>
  );
}

/** A library entry rendered as if it were already a view, so both share one artwork rule. */
function viewFromEntry(entry: LibraryEntry): View {
  const view: MutableView = {
    id: "",
    label: entry.label,
    source: entry.source,
  };

  if (entry.logoPath !== undefined) {
    view.logoPath = entry.logoPath;
  }

  if (entry.backdropPath !== undefined) {
    view.backdropPath = entry.backdropPath;
  }

  return view;
}

function Tile({ entry, existing }: Readonly<{ entry: LibraryEntry; existing: View | undefined }>) {
  const artwork = viewArtwork(viewFromEntry(entry));

  return (
    <li className={styles.tile} style={{ background: artwork.background }}>
      {artwork.logo === "wordmark" && entry.logoPath ? (
        <Image
          alt=""
          className={styles.tileWordmark}
          height={48}
          src={tmdbWordmarkUrl(entry.logoPath)}
          unoptimized
          width={120}
        />
      ) : null}
      {artwork.logo === "icon" && entry.logoPath ? (
        <Image
          alt=""
          className={styles.tileIcon}
          height={32}
          src={tmdbImageUrl("w154", entry.logoPath)}
          unoptimized
          width={32}
        />
      ) : null}
      {artwork.logo === "wordmark" ? null : <span className={styles.tileLabel}>{entry.label}</span>}
      {entry.note ? <span className={styles.tileNote}>{entry.note}</span> : null}
      {existing ? (
        <form action={removeView}>
          <input name="id" type="hidden" value={existing.id} />
          <button
            aria-label={`Remove ${entry.label} from sidebar`}
            className={`${styles.tileButton} ${styles.tileButtonAdded}`}
            type="submit"
          >
            ✓ Added
          </button>
        </form>
      ) : (
        <form action={addView}>
          <input name="label" type="hidden" value={entry.label} />
          <input name="source" type="hidden" value={JSON.stringify(entry.source)} />
          {entry.logoPath ? <input name="logoPath" type="hidden" value={entry.logoPath} /> : null}
          {entry.backdropPath ? (
            <input name="backdropPath" type="hidden" value={entry.backdropPath} />
          ) : null}
          <button
            aria-label={`Add ${entry.label} to sidebar`}
            className={styles.tileButton}
            type="submit"
          >
            + Add
          </button>
        </form>
      )}
    </li>
  );
}

export async function ViewLibraryPage({ category, query }: ViewLibraryPageProperties) {
  const data = await loadLibraryPage(category, query);

  return (
    <div className={styles.backdrop}>
      <section aria-labelledby="add-view-heading" className={styles.modal}>
        <section aria-labelledby="your-sidebar-heading" className={styles.sidebarPane}>
          <h2 className={styles.paneHeading} id="your-sidebar-heading">
            Your sidebar
          </h2>
          <p className={styles.paneNote}>
            Views are just saved filters. Reorder them or remove any you no longer use.
          </p>
          <ul className={styles.itemList}>
            {data.views.map((view, index) => (
              <SidebarItem count={data.views.length} index={index} key={view.id} view={view} />
            ))}
          </ul>
          <PreferencesForm
            className={styles.preferences}
            labelClassName={styles.preference}
            languages={data.languages}
            noteClassName={styles.preferenceNote}
            selectClassName={styles.preferenceSelect}
            settings={data.settings}
          />
        </section>

        <section className={styles.libraryPane}>
          <header className={styles.libraryHeader}>
            <h1 className={styles.libraryHeading} id="add-view-heading">
              Add a view
            </h1>
            <span className={styles.librarySource}>
              Sourced from Seerr's provider, network, studio, genre, language and keyword lists
            </span>
            <Link aria-label="Close" className={styles.close} href="/">
              ✕
            </Link>
          </header>
          <form action="/views" className={styles.searchForm} method="get">
            {category === "all" ? null : <input name="category" type="hidden" value={category} />}
            <input
              aria-label="Search sources"
              className={styles.search}
              defaultValue={query}
              name="q"
              placeholder="Search networks, studios, genres, languages, keywords…"
              type="search"
            />
          </form>
          <nav aria-label="Source categories" className={styles.categories}>
            {libraryCategories.map((item) => (
              <Link
                aria-current={item.id === category ? "page" : undefined}
                className={item.id === category ? styles.activeCategory : styles.category}
                href={libraryHref(item.id, query)}
                key={item.id}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.library}>
            {data.error ? (
              <p className={styles.libraryError} role="alert">
                {data.error}
              </p>
            ) : null}
            {data.groups.length === 0 && !data.error ? (
              <p className={styles.libraryEmpty}>Nothing matches “{query}”.</p>
            ) : null}
            {data.groups.map((group) => (
              <section aria-label={group.label} key={group.section}>
                <h2 className={styles.sectionHeading}>
                  {group.label}
                  {group.note ? <small>{group.note}</small> : null}
                </h2>
                <ul className={styles.tileGrid}>
                  {group.entries.map((entry) => (
                    <Tile
                      entry={entry}
                      existing={data.views.find((view) => sameSource(view.source, entry.source))}
                      key={JSON.stringify(entry.source)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <footer className={styles.footer}>
            <Link className={`${styles.button} ${styles.primaryButton}`} href="/">
              Done
            </Link>
          </footer>
        </section>
      </section>
    </div>
  );
}
