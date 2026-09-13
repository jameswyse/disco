import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Suspense } from "react";

import { BrowsePage } from "@/features/browse/BrowsePage";
import { discoverListLabels, parseDiscoverListId } from "@/features/browse/discoverLists";
import { parseBrowseFilters } from "@/features/browse/filters";
import { parsePageNumber } from "@/features/browse/pageNumber";
import { loadSettings } from "@/features/settings/loadSettings";
import { defaultPreviewMode } from "@/features/settings/settings";
import { loadViews } from "@/features/views/loadViews";

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

  return { title: `${discoverListLabels[parseDiscoverListId(query.list)]} · ${view.label}` };
}

async function ViewBrowse(properties: ViewPageProperties) {
  const [view, query, settings] = await Promise.all([
    resolveView(properties),
    properties.searchParams,
    loadSettings(),
  ]);

  return (
    <BrowsePage
      defaultLanguage={settings.defaultLanguage}
      filters={parseBrowseFilters(query, settings.defaultLanguage)}
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
