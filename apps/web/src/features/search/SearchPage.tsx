import { ContentState } from "@/features/feedback/ContentState";
import { InfiniteList } from "@/features/feedback/InfiniteList";
import { decodePageNumber } from "@/features/feedback/pageNumber";
import { loadSettings } from "@/features/settings/loadSettings";
import { defaultPreviewMode } from "@/features/settings/settings";

import { loadSearch } from "./loadSearch";
import { SearchResultCard } from "./SearchResultCard";

import type { PageBatch } from "@/features/feedback/InfiniteList";

import browseStyles from "@/features/browse/BrowsePage.module.css";

export async function SearchPage({ query, page }: Readonly<{ query: string; page: number }>) {
  const settings = await loadSettings();
  const previewMode = settings.previewMode ?? defaultPreviewMode;

  async function loadPage(nextPage: number): Promise<PageBatch> {
    "use server";
    const result = await loadSearch(query, decodePageNumber(nextPage));

    if (result.kind === "error") {
      return result;
    }

    return {
      ...result,
      items: result.items.map((item) => ({
        id: `${item.mediaType}-${item.id}`,
        content: <SearchResultCard item={item} previewMode={previewMode} />,
      })),
      summary: `${result.totalResults.toLocaleString("en-AU")} results for “${query}” · page ${result.page} of ${Math.max(1, result.totalPages)}`,
    };
  }

  const result = query ? await loadPage(page) : undefined;

  return (
    <>
      <header className={browseStyles.tabBar}>
        <h1 className={browseStyles.pageHeading}>Search</h1>
      </header>
      {!result ? (
        <ContentState
          title="Find your next favourite"
          message="Search for movies, TV shows, actors and filmmakers in the search bar above."
        />
      ) : null}
      {result?.kind === "error" ? (
        <ContentState title="Search couldn’t be loaded" message={result.message} retry />
      ) : null}
      {result?.kind === "ok" ? (
        <InfiniteList
          className={browseStyles.grid}
          empty={
            <ContentState
              title="No results found"
              message={`Try another title or person’s name for “${query}”.`}
            />
          }
          initial={result}
          key={`${query}:${page}`}
          label="Search results"
          loadPage={loadPage}
        />
      ) : null}
    </>
  );
}
