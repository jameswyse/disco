import Image from "next/image";

import { AddViewDialog } from "./AddViewDialog";
import { ViewLink } from "./ViewLink";
import { views } from "./views";

import type { SidebarData } from "./loadSidebar";

import styles from "./Sidebar.module.css";

type SidebarProperties = Readonly<{
  /** Undefined while Seerr data is still loading. */
  data: SidebarData | undefined;
}>;

function Footer({ data }: SidebarProperties) {
  if (data === undefined) {
    return <span className={styles.footerNote}>Connecting to Seerr…</span>;
  }

  if (data.kind === "error") {
    return (
      <span className={styles.footerNote} role="alert">
        {data.message}
      </span>
    );
  }

  const openRequests = data.requests.pending + data.requests.processing;

  return (
    <>
      {data.user.avatarUrl ? (
        <Image
          alt=""
          className={styles.avatar}
          height={28}
          src={data.user.avatarUrl}
          unoptimized
          width={28}
        />
      ) : (
        <span aria-hidden="true" className={styles.avatar} />
      )}
      <span>
        <b className={styles.userName}>{data.user.displayName}</b>
        {openRequests === 1 ? "1 open request" : `${openRequests} open requests`}
        {data.requests.pending > 0 ? ` · ${data.requests.pending} pending approval` : ""}
      </span>
    </>
  );
}

export function Sidebar({ data }: SidebarProperties) {
  const providerLogos = data?.kind === "ok" ? data.providerLogos : {};

  return (
    <aside aria-label="Views" className={styles.sidebar}>
      <ul className={styles.viewList}>
        {views.map((view) => (
          <ViewLink key={view.id} logoUrl={providerLogos[view.id]} view={view} />
        ))}
      </ul>
      <AddViewDialog />
      <footer className={styles.footer}>
        <Footer data={data} />
      </footer>
    </aside>
  );
}
