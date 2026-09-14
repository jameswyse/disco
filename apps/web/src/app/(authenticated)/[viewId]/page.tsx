import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Suspense } from "react";

import { browseListLabel } from "@/features/browse/browseListLabel";
import { BrowsePage } from "@/features/browse/BrowsePage";
import { parseDiscoverListId } from "@/features/browse/discoverLists";
import { parseBrowseFilters } from "@/features/browse/filters";
import { loadSettings } from "@/features/settings/loadSettings";
import { defaultPreviewMode } from "@/features/settings/settings";
import { loadViews } from "@/features/views/loadViews";
import { viewMediaTypes } from "@/features/views/views";
import { parsePageNumber } from "@/platform/pageNumber";

import Loading from "../loading";

import type { Metadata } from "next";

type ViewPageProperties = PageProps<"/[viewId]">;

async function resolveView({ params }: ViewPageProperties) {
  await connection();
  const { viewId } = await params;
  const view = (await loadViews()).find((candidate) => candidate.id === viewId);

  if (!view) {
    notFound();
  }

  return view;
}

export async function generateMetadata(properties: ViewPageProperties): Promise<Metadata> {
  const [view, query] = await Promise.all([resolveView(properties), properties.searchParams]);

  return { title: `${browseListLabel(view, parseDiscoverListId(query.list))} · ${view.label}` };
}

async function ViewBrowse(properties: ViewPageProperties) {
  const [view, query, settings] = await Promise.all([
    resolveView(properties),
    properties.searchParams,
    loadSettings(),
  ]);

  const parsed = parseBrowseFilters(query, settings.defaultLanguage);
  const types = viewMediaTypes(view);
  const filters = {
    ...parsed,
    sort: types.length > 1 && parsed.mediaType === "all" ? undefined : parsed.sort,
    genreId: view.source.kind === "genre" ? undefined : parsed.genreId,
    language: view.source.kind === "language" ? undefined : parsed.language,
    mediaType: types.length === 1 ? ("all" as const) : parsed.mediaType,
  };

  return (
    <BrowsePage
      defaultLanguage={settings.defaultLanguage}
      filters={filters}
      listId={parseDiscoverListId(query.list)}
      page={parsePageNumber(query.page)}
      previewMode={settings.previewMode ?? defaultPreviewMode}
      view={view}
    />
  );
}

/** Everything here is request-time, so the page body streams behind a static shell. */
export default function Page(properties: ViewPageProperties) {
  return (
    <Suspense fallback={<Loading />}>
      <ViewBrowse {...properties} />
    </Suspense>
  );
}
