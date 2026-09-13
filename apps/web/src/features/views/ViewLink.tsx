"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { tmdbImageUrl, tmdbWordmarkUrl } from "@/integrations/seerr/images";

import { viewArtwork } from "./viewArtwork";
import { viewDescription } from "./views";

import type { View } from "./views";

import styles from "./Sidebar.module.css";

type ViewLinkProperties = Readonly<{ view: View }>;

export function ViewLink({ view }: ViewLinkProperties) {
  const isActive = usePathname() === `/${view.id}`;
  const artwork = viewArtwork(view);
  const classNames = [styles.viewCard];

  if (view.source.kind === "media") {
    classNames.push(styles.mediaCard);
  }

  if (isActive) {
    classNames.push(styles.activeCard);
  }

  const label = (
    <span className={styles.viewLabel}>
      {view.label}
      {view.source.kind === "media" ? (
        <small className={styles.viewDescription}>{viewDescription(view)}</small>
      ) : null}
    </span>
  );

  return (
    <li>
      <Link
        aria-current={isActive ? "page" : undefined}
        aria-label={view.label}
        className={classNames.join(" ")}
        href={`/${view.id}`}
        style={{ background: artwork.background }}
      >
        {artwork.logo === "wordmark" && view.logoPath ? (
          <Image
            alt=""
            className={styles.wordmark}
            height={60}
            src={tmdbWordmarkUrl(view.logoPath)}
            unoptimized
            width={154}
          />
        ) : null}
        {artwork.logo === "icon" && view.logoPath ? (
          <Image
            alt=""
            className={styles.logo}
            height={36}
            src={tmdbImageUrl("w154", view.logoPath)}
            unoptimized
            width={36}
          />
        ) : null}
        {artwork.logo === "wordmark" ? null : label}
      </Link>
    </li>
  );
}
