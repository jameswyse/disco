import Link from "next/link";

import { withTitleFacts } from "@/features/browse/titleFacts";
import { TitleGrid } from "@/features/browse/TitleGrid";
import { loadSettings } from "@/features/settings/loadSettings";
import { defaultPreviewMode } from "@/features/settings/settings";

import { loadSearch } from "./loadSearch";

import browseStyles from "@/features/browse/BrowsePage.module.css";

type SearchPageProperties = Readonly<{ query: string; page: number }>;

function searchHref(query: string, page: number): `/search${string}` {
  const parameters = new URLSearchParams({ q: query });

  if (page > 1) {
    parameters.set("page", String(page));
  }

  return `/search?${parameters.toString()}`;
}

export async function SearchPage({ query, page }: SearchPageProperties) {
  const [result, settings] = await Promise.all([
    query === "" ? undefined : loadSearch(query, page),
    loadSettings(),
  ]);
  const titles = result?.kind === "ok" ? await withTitleFacts(result.titles) : [];

  return (
    <>
      <header className={browseStyles.tabBar}>
        <h1 className={browseStyles.pageHeading}>Search</h1>

        <Link className={browseStyles.requestsButton} href="/requests">
          Requests
        </Link>
      </header>

      {result === undefined ? (
        <p className={browseStyles.summary}>Search Seerr for movies and TV shows by title.</p>
      ) : null}
      {result?.kind === "error" ? (
        <p className={browseStyles.summary} role="alert">
          {result.message}
        </p>
      ) : null}
      {result?.kind === "ok" ? (
        <>
          <p className={browseStyles.summary}>
            <b>{result.totalResults.toLocaleString("en-AU")}</b> results for “{query}” · page{" "}
            {result.page} of {Math.max(1, result.totalPages)}
          </p>
          <TitleGrid
            label="Search results"
            previewMode={settings.previewMode ?? defaultPreviewMode}
            titles={titles}
          />
          <nav aria-label="Pages" className={browseStyles.pagination}>
            {result.page > 1 ? (
              <Link className={browseStyles.pageLink} href={searchHref(query, page - 1)}>
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {result.page < result.totalPages ? (
              <Link className={browseStyles.pageLink} href={searchHref(query, page + 1)}>
                Next →
              </Link>
            ) : null}
          </nav>
        </>
      ) : null}
    </>
  );
}
