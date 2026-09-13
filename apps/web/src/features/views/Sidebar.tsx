import Link from "next/link";

import { AddViewDialog } from "./AddViewDialog";
import { placeholderActiveViewId, placeholderSidebarViews } from "./sidebarViews";

import type { SidebarView } from "./sidebarViews";

import styles from "./Sidebar.module.css";

function viewCardClassName(view: SidebarView): string {
  const classNames = [styles.viewCard];

  if (view.kind === "media") {
    classNames.push(styles.mediaCard);
  }

  if (view.id === placeholderActiveViewId) {
    classNames.push(styles.activeCard);
  }

  return classNames.join(" ");
}

function ViewCard({ view }: Readonly<{ view: SidebarView }>) {
  return (
    <li>
      <Link
        aria-current={view.id === placeholderActiveViewId ? "page" : undefined}
        className={viewCardClassName(view)}
        href="/"
        style={{ background: view.tone }}
      >
        <span className={styles.viewLabel}>
          {view.label}
          {view.kind === "media" ? (
            <small className={styles.viewDescription}>{view.description}</small>
          ) : null}
        </span>
        {view.kind === "provider" && view.hasNewTitles ? (
          <span aria-label="New titles" className={styles.newTitles} role="img" />
        ) : null}
      </Link>
    </li>
  );
}

export function Sidebar() {
  return (
    <aside aria-label="Views" className={styles.sidebar}>
      <ul className={styles.viewList}>
        {placeholderSidebarViews.map((view) => (
          <ViewCard key={view.id} view={view} />
        ))}
      </ul>
      <AddViewDialog />
      <footer className={styles.footer}>
        <span aria-hidden="true" className={styles.avatar} />
        <span>
          <b className={styles.userName}>James</b>
          Seerr · Plex
        </span>
      </footer>
    </aside>
  );
}
