"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useState } from "react";

import { ContentState } from "@/features/feedback/ContentState";

import { libraryCategories } from "./libraryFilters";
import { LibraryTile } from "./LibraryTile";
import { useViewEditor } from "./ViewEditor";
import { sameSource } from "./views";

import type { LibraryCategory } from "./libraryFilters";
import type { LibraryPageData } from "./loadLibraryPage";

import styles from "./ViewLibraryPage.module.css";

function libraryHref(category: LibraryCategory, query: string, country: string): `/views${string}` {
  const parameters = new URLSearchParams();

  if (category !== "all") {
    parameters.set("category", category);
  }

  if (query !== "") {
    parameters.set("q", query);
  }

  if (country !== "") {
    parameters.set("country", country);
  }

  const encoded = parameters.toString();

  return encoded === "" ? "/views" : `/views?${encoded}`;
}

export function ViewLibrary({
  category,
  query,
  data,
}: Readonly<{
  category: LibraryCategory;
  query: string;
  data: LibraryPageData;
}>) {
  const editor = useViewEditor();
  const router = useRouter();
  const [overLibrary, setOverLibrary] = useState(false);
  const groups = data.groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter(
        (entry) => !editor.views.some((view) => sameSource(view.source, entry.source)),
      ),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <section
      aria-labelledby="manage-views-heading"
      className={`${styles.page} ${overLibrary && editor.dragged?.kind === "sidebar" ? styles.dropLibrary : ""}`}
    >
      <div
        className={styles.libraryContent}
        onDragOver={(event) => {
          if (editor.dragged?.kind !== "sidebar" || editor.pending) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOverLibrary(true);
        }}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setOverLibrary(false);
          }
        }}
        onDrop={(event) => {
          if (editor.dragged?.kind !== "sidebar" || editor.pending) {
            return;
          }

          event.preventDefault();
          editor.remove(editor.dragged.id);
          editor.setDragged(null);
          setOverLibrary(false);
        }}
      >
        <header className={styles.libraryHeader}>
          <div className={styles.headingGroup}>
            <h1 className={styles.libraryHeading} id="manage-views-heading">
              Manage views
            </h1>
            <p className={styles.librarySource}>Drag views between here and your sidebar.</p>
          </div>
        </header>
        <div className={styles.filters}>
          <nav aria-label="Source categories" className={styles.categories}>
            {libraryCategories.map((item) => (
              <Link
                aria-current={item.id === category ? "page" : undefined}
                className={item.id === category ? styles.activeCategory : styles.category}
                href={libraryHref(item.id, query, data.country)}
                key={item.id}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.searchControls}>
            {(category === "all" || category === "streaming") && data.countries.length > 0 ? (
              <select
                aria-label="Streaming country"
                className={styles.country}
                defaultValue={data.country}
                key={data.country}
                onChange={(event) => router.push(libraryHref(category, query, event.target.value))}
              >
                {data.countries.map((country) => (
                  <option key={country.iso_3166_1} value={country.iso_3166_1}>
                    {country.english_name}
                  </option>
                ))}
              </select>
            ) : null}
            <form action="/views" className={styles.searchForm} method="get">
              <input name="category" type="hidden" value={category} />
              <input name="country" type="hidden" value={data.country} />
              <input
                aria-label="Search sources"
                className={styles.search}
                defaultValue={query}
                key={query}
                name="q"
                placeholder="Search views…"
                type="search"
              />
            </form>
          </div>
        </div>
        <div className={styles.library}>
          {data.error ? (
            <ContentState title="Views couldn’t be loaded" message={data.error} retry />
          ) : null}
          {groups.length === 0 && !data.error ? (
            <p className={styles.libraryEmpty}>
              {query
                ? `No available views match “${query}”.`
                : "All available views are in your sidebar."}
            </p>
          ) : null}
          {groups.map((group) => (
            <section aria-label={group.label} key={group.section}>
              <h2 className={styles.sectionHeading}>{group.label}</h2>
              <ul
                className={group.section === "streaming" ? styles.streamingGrid : styles.tileGrid}
              >
                {group.entries.map((entry) => (
                  <LibraryTile entry={entry} key={JSON.stringify(entry.source)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
