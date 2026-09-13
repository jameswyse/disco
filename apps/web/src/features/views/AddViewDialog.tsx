"use client";

import { useRef } from "react";

import { placeholderSidebarViews } from "./sidebarViews";

import styles from "./AddViewDialog.module.css";

const sourceCategories = [
  "All",
  "Streaming",
  "Networks",
  "Studios",
  "Genres",
  "Languages",
  "Countries",
  "Keywords",
  "People",
] as const;

const librarySections = [
  { id: "streaming", label: "Streaming services", note: "available in AU" },
  { id: "networks", label: "Networks", note: undefined },
  { id: "studios", label: "Studios", note: undefined },
] as const;

export function AddViewDialog() {
  const dialogReference = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className={styles.trigger}
        onClick={() => dialogReference.current?.showModal()}
        type="button"
      >
        + Add a view
      </button>
      <dialog aria-labelledby="add-view-heading" className={styles.dialog} ref={dialogReference}>
        <div className={styles.layout}>
          <section aria-labelledby="your-sidebar-heading" className={styles.sidebarPane}>
            <h2 className={styles.paneHeading} id="your-sidebar-heading">
              Your sidebar
            </h2>
            <p className={styles.paneNote}>
              Drag to reorder. Views are just saved filters — edit any of them.
            </p>
            <ul className={styles.viewList}>
              {placeholderSidebarViews.map((view) => (
                <li className={styles.viewItem} key={view.id}>
                  <span aria-hidden="true" className={styles.grip}>
                    ⋮⋮
                  </span>
                  <span className={styles.viewItemLabel}>{view.label}</span>
                  <span aria-hidden="true" className={styles.viewItemEdit}>
                    ✎
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="Available sources" className={styles.libraryPane}>
            <header className={styles.libraryHeader}>
              <h2 className={styles.libraryHeading} id="add-view-heading">
                Add a view
              </h2>
              <span className={styles.librarySource}>
                Sourced from Seerr's network, company, genre and keyword lists
              </span>
              <form className={styles.closeForm} method="dialog">
                <button aria-label="Close" className={styles.close} type="submit">
                  ✕
                </button>
              </form>
            </header>
            <input
              aria-label="Search sources"
              className={styles.search}
              disabled
              placeholder="Search networks, studios, genres, languages, keywords…"
              type="search"
            />
            <ul className={styles.categories}>
              {sourceCategories.map((category) => (
                <li
                  className={category === "All" ? styles.activeCategory : styles.category}
                  key={category}
                >
                  {category}
                </li>
              ))}
            </ul>
            <div className={styles.library}>
              {librarySections.map((section) => (
                <section aria-label={section.label} key={section.id}>
                  <h3 className={styles.sectionHeading}>
                    {section.label}
                    {section.note ? <small>{section.note}</small> : null}
                  </h3>
                  <p className={styles.sectionPlaceholder}>
                    Sources load from Seerr once the integration is connected.
                  </p>
                </section>
              ))}
            </div>
            <footer className={styles.footer}>
              <form method="dialog">
                <button className={styles.button} type="submit">
                  Cancel
                </button>
              </form>
              <form method="dialog">
                <button className={`${styles.button} ${styles.primaryButton}`} type="submit">
                  Done
                </button>
              </form>
            </footer>
          </section>
        </div>
      </dialog>
    </>
  );
}
