import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BrowsePage } from "@/features/browse/BrowsePage";
import { discoverListLabels, parseDiscoverListId } from "@/features/browse/discoverLists";
import { parseBrowseFilters } from "@/features/browse/filters";
import { parsePageNumber } from "@/features/browse/pageNumber";
import { loadViews } from "@/features/views/loadViews";

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

export default async function Page(properties: ViewPageProperties) {
  const [view, query] = await Promise.all([resolveView(properties), properties.searchParams]);

  return (
    <BrowsePage
      filters={parseBrowseFilters(query)}
      listId={parseDiscoverListId(query.list)}
      page={parsePageNumber(query.page)}
      view={view}
    />
  );
}
