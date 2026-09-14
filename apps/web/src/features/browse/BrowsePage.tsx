import Link from "next/link";

import { ContentState } from "@/features/feedback/ContentState";
import { InfiniteList } from "@/features/feedback/InfiniteList";
import { TitleCard } from "@/features/title/TitleCard";
import { withTitleFacts } from "@/features/title/titleFacts";
import { viewMediaTypes } from "@/features/views/views";
import { decodePageNumber } from "@/platform/pageNumber";

import { BrowseEmptyState } from "./BrowseEmptyState";
import { browseHref } from "./browseHref";
import { browseListLabel } from "./browseListLabel";
import { discoverListIds } from "./discoverLists";
import { FilterMenu } from "./FilterMenu";
import { loadBrowse } from "./loadBrowse";

import type { PageBatch } from "@/features/feedback/InfiniteList";
import type { PreviewMode } from "@/features/settings/settings";
import type { View } from "@/features/views/views";

import type { BrowseLocation } from "./browseHref";
import type { DiscoverListId } from "./discoverLists";
import type { BrowseFilters } from "./filters";

import styles from "./BrowsePage.module.css";

type BrowsePageProperties = Readonly<{
  view: View;
  listId: DiscoverListId;
  filters: BrowseFilters;
  defaultLanguage: string | undefined;
  previewMode: PreviewMode;
  page: number;
}>;

async function makeBatch(
  view: View,
  listId: DiscoverListId,
  previewMode: PreviewMode,
  result: Awaited<ReturnType<typeof loadBrowse>>,
): Promise<PageBatch> {
  if (result.kind === "error") {
    return result;
  }

  const titles = await withTitleFacts(result.titles);

  return {
    kind: "ok",
    page: result.page,
    totalPages: result.totalPages,
    items: titles.map((title) => ({
      id: `${title.mediaType}-${title.id}`,
      content: <TitleCard title={title} previewMode={previewMode} />,
    })),
    summary: `${browseListLabel(view, listId)} on ${view.label} · ${result.totalResults.toLocaleString("en-AU")} titles · page ${result.page} of ${Math.max(1, result.totalPages)}${result.hiddenAvailable ? ` · ${result.hiddenAvailable} hidden because they're already available` : ""}`,
  };
}

export async function BrowsePage({
  view,
  listId,
  filters,
  defaultLanguage,
  previewMode,
  page,
}: BrowsePageProperties) {
  const result = await loadBrowse(view, listId, filters, page);

  async function loadPage(nextPage: number): Promise<PageBatch> {
    "use server";

    return makeBatch(
      view,
      listId,
      previewMode,
      await loadBrowse(view, listId, filters, decodePageNumber(nextPage)),
    );
  }

  const initial = await makeBatch(view, listId, previewMode, result);
  const location: BrowseLocation = { viewId: view.id, listId, filters, defaultLanguage, page };

  return (
    <>
      <header className={styles.tabBar}>
        <nav aria-label="Discover lists" className={styles.tabs}>
          {discoverListIds.map((id) => (
            <Link
              aria-current={id === listId ? "page" : undefined}
              className={id === listId ? styles.activeTab : styles.tab}
              href={browseHref({ ...location, listId: id, page: 1 })}
              key={id}
            >
              {browseListLabel(view, id)}
            </Link>
          ))}
        </nav>
        <FilterMenu
          genres={result.kind === "ok" ? result.genres : []}
          location={location}
          lockedGenre={view.source.kind === "genre" ? view.label : undefined}
          lockedLanguage={view.source.kind === "language" ? view.label : undefined}
          mixedMedia={viewMediaTypes(view).length > 1}
        />
      </header>

      {initial.kind === "error" ? (
        <ContentState title="Titles couldn’t be loaded" message={initial.message} retry />
      ) : (
        <InfiniteList
          initial={initial}
          loadPage={loadPage}
          key={browseHref(location)}
          label={`${browseListLabel(view, listId)} titles`}
          className={styles.grid}
          empty={
            <BrowseEmptyState
              hiddenAvailable={result.kind === "ok" ? result.hiddenAvailable : 0}
              location={location}
              view={view}
            />
          }
        />
      )}
    </>
  );
}
