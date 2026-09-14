"use client";
import { useState } from "react";

import { TitleCard } from "@/features/browse/TitleCard";
import { ContentState } from "@/features/feedback/ContentState";
import { InfiniteList } from "@/features/feedback/InfiniteList";

import type { Title } from "@/features/browse/title";
import type { PageBatch } from "@/features/feedback/InfiniteList";
import type { PreviewMode } from "@/features/settings/settings";

import styles from "./PersonPage.module.css";
import gridStyles from "@/features/browse/BrowsePage.module.css";

export function Filmography({
  titles,
  previewMode,
}: Readonly<{ titles: readonly Title[]; previewMode: PreviewMode }>) {
  const [type, setType] = useState("all");
  const visible = titles.filter((title) => type === "all" || title.mediaType === type);

  function batch(page: number): Extract<PageBatch, { kind: "ok" }> {
    return {
      kind: "ok",
      items: visible.slice((page - 1) * 24, page * 24).map((title) => ({
        id: `${title.mediaType}-${title.id}`,
        content: <TitleCard title={title} previewMode={previewMode} />,
      })),
      page,
      totalPages: Math.ceil(visible.length / 24),
      summary: `${visible.length} credits · newest first`,
    };
  }

  return (
    <section>
      <header className={styles.creditsHeader}>
        <h2>Filmography</h2>
        <select
          aria-label="Credit type"
          onChange={(event) => setType(event.target.value)}
          value={type}
        >
          <option value="all">Movies &amp; TV</option>
          <option value="movie">Movies</option>
          <option value="tv">TV shows</option>
        </select>
      </header>
      <InfiniteList
        initial={batch(1)}
        key={type}
        label="Filmography"
        className={gridStyles.grid}
        loadPage={(page) => Promise.resolve(batch(page))}
        empty={
          <ContentState
            title="No credits found"
            message="Credits will appear here when they are available."
          />
        }
      />
    </section>
  );
}
