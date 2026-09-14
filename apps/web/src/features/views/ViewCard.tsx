"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { viewArtwork } from "./viewArtwork";
import { useViewEditor } from "./ViewEditor";

import type { SidebarStyle } from "@/features/settings/settings";

import type { View } from "./views";

import styles from "./Sidebar.module.css";

type ViewCardProperties = Readonly<{ view: View; sidebarStyle: SidebarStyle }>;

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
      label
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
