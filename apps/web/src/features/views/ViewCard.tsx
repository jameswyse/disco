"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { viewArtwork, viewIcon } from "./viewArtwork";
import { useViewEditor } from "./ViewEditor";

import type { SidebarStyle } from "@/features/settings/settings";
import type { MediaType } from "@/integrations/seerr/client";

import type { ViewIcon } from "./viewArtwork";
import type { View } from "./views";

import styles from "./Sidebar.module.css";

type ViewCardProperties = Readonly<{ view: View; sidebarStyle: SidebarStyle }>;

const mediaGlyphs = {
  movie:
    "M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 4v16 M16 4v16 M4 9h4 M4 15h4 M16 9h4 M16 15h4",
  tv: "M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z M8 3l4 4 4-4",
} as const satisfies Record<MediaType, string>;

function ViewCardIcon({ icon }: Readonly<{ icon: ViewIcon }>) {
  switch (icon.kind) {
    case "image":
      return (
        <Image
          alt=""
          className={styles.viewIcon}
          draggable={false}
          height={20}
          src={icon.src}
          unoptimized
          width={20}
        />
      );
    case "glyph":
      return (
        <span aria-hidden="true" className={`${styles.viewIcon} ${styles.glyphIcon}`}>
          <svg
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d={mediaGlyphs[icon.mediaType]} />
          </svg>
        </span>
      );
    case "swatch":
      return (
        <span
          aria-hidden="true"
          className={styles.viewIcon}
          style={{ background: icon.background }}
        />
      );

    default: {
      const unsupportedIcon: never = icon;

      return unsupportedIcon;
    }
  }
}

export function ViewCard({ view, sidebarStyle }: ViewCardProperties) {
  const pathname = usePathname();
  const editor = useViewEditor();
  const isActive = pathname === `/${view.id}`;
  const artwork = viewArtwork(view);
  const classNames = [styles.viewCard];

  if (view.source.kind === "media") {
    classNames.push(styles.mediaCard);
  }

  if (isActive) {
    classNames.push(styles.activeCard);
  }

  const label = <span className={styles.viewLabel}>{view.label}</span>;

  const content =
    sidebarStyle === "small" ? (
      <>
        <ViewCardIcon icon={viewIcon(view)} />
        {label}
      </>
    ) : (
      <>
        {artwork.logo.kind === "wordmark" ? (
          <Image
            alt=""
            className={styles.wordmark}
            height={80}
            src={artwork.logo.src}
            draggable={false}
            unoptimized
            width={200}
          />
        ) : null}
        {artwork.logo.kind === "icon" ? (
          <Image
            alt=""
            className={styles.logo}
            height={44}
            src={artwork.logo.src}
            draggable={false}
            unoptimized
            width={44}
          />
        ) : null}
        {artwork.logo.kind === "wordmark" ? null : label}
      </>
    );

  if (pathname === "/views") {
    return (
      <button
        aria-label={`Reorder ${view.label}`}
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        className={`${classNames.join(" ")} ${styles.draggableCard}`}
        disabled={editor.pending}
        draggable={!editor.pending}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", view.id);
          editor.setDragged({ kind: "sidebar", id: view.id });
        }}
        onDragEnd={() => editor.setDragged(null)}
        onKeyDown={(event) => {
          if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            editor.move(view.id, event.key === "ArrowUp" ? "up" : "down");
          }
        }}
        style={sidebarStyle === "small" ? undefined : { background: artwork.background }}
        title="Drag to reorder, or use Alt + arrow keys while focused."
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      aria-label={view.label}
      className={classNames.join(" ")}
      href={`/${view.id}`}
      draggable={false}
      title={view.label}
      style={sidebarStyle === "small" ? undefined : { background: artwork.background }}
    >
      {content}
    </Link>
  );
}
