import Image from "next/image";
import Link from "next/link";

import { Suspense } from "react";

import { LogoutButton } from "@/features/auth/LogoutButton";

import { loadAccount, loadSidebarViews } from "./loadSidebar";
import { loadMediaBackdrops } from "./loadViewBackdrops";
import { ViewLink } from "./ViewLink";

import type { View } from "./views";

import styles from "./Sidebar.module.css";

/** Media views without saved artwork borrow a backdrop from this week's trending titles. */
function withArtwork(view: View, backdrops: Awaited<ReturnType<typeof loadMediaBackdrops>>): View {
  if (view.source.kind !== "media" || view.backdropPath !== undefined) {
    return view;
  }

  const backdropPath = backdrops[view.source.mediaType];

  return backdropPath === undefined ? view : { ...view, backdropPath };
}

async function ViewList() {
  // Sequential on purpose: the views loader waits for the request, which keeps the cached
  // backdrop lookup (and its Seerr calls) out of the build-time prerender.
  const views = await loadSidebarViews();
  const backdrops = await loadMediaBackdrops();

  return (
    <ul className={styles.viewList}>
      {views.map((view) => (
        <ViewLink key={view.id} view={withArtwork(view, backdrops)} />
      ))}
    </ul>
  );
}

async function Account() {
  const account = await loadAccount();

  if (account.kind === "error") {
    return (
      <span className={styles.footerNote} role="alert">
        {account.message}
      </span>
    );
  }

  const { user, requests } = account;
  const openRequests = requests.pending + requests.processing;

  return (
    <>
      {user.avatarUrl ? (
        <Image
          alt=""
          className={styles.avatar}
          height={28}
          src={user.avatarUrl}
          unoptimized
          width={28}
        />
      ) : (
        <span aria-hidden="true" className={styles.avatar} />
      )}
      <span>
        <b className={styles.userName}>{user.displayName}</b>
        <Link className={styles.footerLink} href="/requests">
          {openRequests === 1 ? "1 open request" : `${openRequests} open requests`}
          {requests.pending > 0 ? ` · ${requests.pending} pending approval` : ""}
        </Link>
        <LogoutButton />
      </span>
    </>
  );
}

export function Sidebar() {
  return (
    <aside aria-label="Views" className={styles.sidebar}>
      <Suspense fallback={<ul aria-busy="true" className={styles.viewList} />}>
        <ViewList />
      </Suspense>
      <Link className={styles.addView} href="/views">
        + Add a view
      </Link>
      <Link className={styles.preferencesLink} href={{ hash: "preferences", pathname: "/views" }}>
        Preferences
      </Link>
      <footer className={styles.footer}>
        <Suspense fallback={<span className={styles.footerNote}>Connecting to Seerr…</span>}>
          <Account />
        </Suspense>
      </footer>
    </aside>
  );
}
