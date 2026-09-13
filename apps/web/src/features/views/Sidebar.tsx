import Image from "next/image";
import Link from "next/link";

import { Suspense } from "react";

import { loadAccount, loadSidebarViews } from "./loadSidebar";
import { ViewLink } from "./ViewLink";

import styles from "./Sidebar.module.css";

async function ViewList() {
  const views = await loadSidebarViews();

  return (
    <ul className={styles.viewList}>
      {views.map((view) => (
        <ViewLink key={view.id} view={view} />
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
      <footer className={styles.footer}>
        <Suspense fallback={<span className={styles.footerNote}>Connecting to Seerr…</span>}>
          <Account />
        </Suspense>
      </footer>
    </aside>
  );
}
