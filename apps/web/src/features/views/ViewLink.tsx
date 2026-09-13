"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { View } from "./views";

import styles from "./Sidebar.module.css";

type ViewLinkProperties = Readonly<{ view: View; logoUrl: string | undefined }>;

export function ViewLink({ view, logoUrl }: ViewLinkProperties) {
  const isActive = usePathname() === `/${view.id}`;
  const classNames = [styles.viewCard];

  if (view.kind === "media") {
    classNames.push(styles.mediaCard);
  }

  if (isActive) {
    classNames.push(styles.activeCard);
  }

  return (
    <li>
      <Link
        aria-current={isActive ? "page" : undefined}
        className={classNames.join(" ")}
        href={`/${view.id}`}
        style={{ background: view.tone }}
      >
        {view.kind === "provider" && logoUrl !== undefined ? (
          <Image alt="" className={styles.logo} height={36} src={logoUrl} unoptimized width={36} />
        ) : null}
        <span className={styles.viewLabel}>
          {view.label}
          {view.kind === "media" ? (
            <small className={styles.viewDescription}>{view.description}</small>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
