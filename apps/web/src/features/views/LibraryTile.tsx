"use client";

import Image from "next/image";

import { tmdbImageUrl } from "@/integrations/seerr/images";

import { viewArtwork } from "./viewArtwork";
import { useViewEditor } from "./ViewEditor";

import type { LibraryEntry } from "./library";
import type { MutableView, View } from "./views";

import styles from "./ViewLibraryPage.module.css";

function viewFromEntry(entry: LibraryEntry): View {
  const view: MutableView = { id: "", label: entry.label, source: entry.source };

  if (entry.logoPath !== undefined) {
    view.logoPath = entry.logoPath;
  }

  if (entry.backdropPath !== undefined) {
    view.backdropPath = entry.backdropPath;
  }

  return view;
}

export function LibraryTile({ entry }: Readonly<{ entry: LibraryEntry }>) {
  const artwork = viewArtwork(viewFromEntry(entry));
  const editor = useViewEditor();
  const streaming = entry.source.kind === "provider";
  const genre = entry.source.kind === "genre";
  const tooltip = `${entry.label}${entry.note ? ` · ${entry.note}` : ""}. Click to add, or drag into the sidebar.`;

  return (
    <li aria-label={entry.label}>
      <button
        aria-label={`Add ${entry.label} to sidebar`}
        className={`${styles.tile} ${streaming ? styles.streamingTile : ""} ${genre ? styles.genreTile : ""}`}
        disabled={editor.pending}
        draggable={!editor.pending}
        onClick={() => editor.add(entry)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", entry.label);
          editor.setDragged({ kind: "library", entry });
        }}
        onDragEnd={() => editor.setDragged(null)}
        style={streaming ? undefined : { background: artwork.background }}
        title={tooltip}
        type="button"
      >
        {streaming ? (
          entry.logoPath ? (
            <Image
              alt=""
              className={styles.streamingLogo}
              draggable={false}
              height={104}
              src={tmdbImageUrl("w154", entry.logoPath)}
              unoptimized
              width={104}
            />
          ) : (
            <span className={styles.streamingName}>{entry.label}</span>
          )
        ) : (
          <>
            {artwork.logo.kind === "wordmark" ? (
              <Image
                alt=""
                className={styles.tileWordmark}
                draggable={false}
                height={48}
                src={artwork.logo.src}
                unoptimized
                width={120}
              />
            ) : null}
            {artwork.logo.kind === "icon" ? (
              <Image
                alt=""
                className={styles.tileIcon}
                draggable={false}
                height={32}
                src={artwork.logo.src}
                unoptimized
                width={32}
              />
            ) : null}
            {artwork.logo.kind === "wordmark" ? null : (
              <span className={styles.tileLabel}>{entry.label}</span>
            )}
            {entry.note ? <span className={styles.tileNote}>{entry.note}</span> : null}
            <span aria-hidden="true" className={styles.tileAdd}>
              + Add
            </span>
          </>
        )}
      </button>
    </li>
  );
}
