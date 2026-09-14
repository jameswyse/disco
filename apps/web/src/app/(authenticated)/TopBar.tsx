"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { Suspense } from "react";

import { SearchBox } from "@/features/search/SearchBox";

import type { ReactNode } from "react";

import styles from "./TopBar.module.css";

const links = [
  { href: "/", label: "Browse", segment: null },
  { href: "/requests", label: "Requests", segment: "requests" },
] as const;

export function TopBar({
  account,
  requestCount,
}: Readonly<{ account: ReactNode; requestCount: ReactNode }>) {
  const segment = useSelectedLayoutSegment();
  const activeSegment =
    segment === "settings" || segment === "views" || segment === "requests" ? segment : null;

  return (
    <header className={styles.bar}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <div className={styles.leading}>
        <Link aria-label="Disco home" className={styles.brand} href="/">
          <svg
            aria-hidden="true"
            className={styles.ball}
            fill="none"
            height="36"
            viewBox="0 0 40 40"
            width="36"
          >
            <path d="M20 1v5" stroke="currentColor" strokeWidth="2" />
            <circle cx="20" cy="22" fill="currentColor" fillOpacity=".12" r="14" />
            <g stroke="currentColor" strokeWidth="1.5">
              <circle cx="20" cy="22" r="14" />
              <ellipse cx="20" cy="22" rx="7" ry="14" />
              <path d="M20 8v28M6 22h28M8.5 14h23M8.5 30h23" />
            </g>
            <path
              d="m34 3 1.2 3.8L39 8l-3.8 1.2L34 13l-1.2-3.8L29 8l3.8-1.2ZM5 30l.9 2.6L8.5 33.5l-2.6.9L5 37l-.9-2.6-2.6-.9 2.6-.9Z"
              fill="currentColor"
            />
          </svg>
          <span>Disco</span>
        </Link>
        <nav aria-label="Primary" className={styles.navigation}>
          {links.map((link) => (
            <Link
              aria-current={link.segment === activeSegment ? "page" : undefined}
              className={styles.link}
              href={link.href}
              key={link.href}
            >
              {link.label}
              {link.segment === "requests" ? <> {requestCount}</> : null}
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.search}>
        <Suspense>
          <SearchBox />
        </Suspense>
      </div>
      <div className={styles.account}>{account}</div>
    </header>
  );
}
