"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { TopBar } from "./TopBar";

import type { ReactNode } from "react";

import styles from "../layout.module.css";

export function AppShell({
  children,
  sidebar,
  account,
  requestCount,
}: Readonly<{
  children: ReactNode;
  sidebar: ReactNode;
  account: ReactNode;
  requestCount: ReactNode;
}>) {
  const segment = useSelectedLayoutSegment();
  const showSidebar = segment !== "settings" && segment !== "requests";

  return (
    <div className={`${styles.app} ${showSidebar ? styles.withSidebar : ""}`}>
      <TopBar account={account} requestCount={requestCount} />
      {showSidebar ? sidebar : null}
      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
