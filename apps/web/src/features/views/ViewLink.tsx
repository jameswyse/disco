"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { tmdbImageUrl, tmdbWordmarkUrl } from "@/integrations/seerr/images";

import { viewArtwork } from "./viewArtwork";

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

  const label = <span className={styles.viewLabel}>{view.label}</span>;

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
            height={80}
            src={tmdbWordmarkUrl(view.logoPath)}
            unoptimized
            width={200}
          />
        ) : null}
        {artwork.logo === "icon" && view.logoPath ? (
          <Image
            alt=""
            className={styles.logo}
            height={44}
            src={tmdbImageUrl("w154", view.logoPath)}
            unoptimized
            width={44}
          />
        ) : null}
        {artwork.logo === "wordmark" ? null : label}
      </Link>
    </li>
  );
}
