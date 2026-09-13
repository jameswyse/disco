import { notFound } from "next/navigation";

import { BrowsePage } from "@/features/browse/BrowsePage";
import { discoverListLabels, parseDiscoverListId } from "@/features/browse/discoverLists";
import { parsePageNumber } from "@/features/browse/pageNumber";
import { findView, views } from "@/features/views/views";

import type { Metadata } from "next";

type ViewPageProperties = PageProps<"/[viewId]">;

/** Views are known at build time, so their shells prerender and the sidebar's pathname resolves. */
export function generateStaticParams() {
  return views.map((view) => ({ viewId: view.id }));
}

async function resolveView({ params }: ViewPageProperties) {
  const view = findView((await params).viewId);

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
      listId={parseDiscoverListId(query.list)}
      page={parsePageNumber(query.page)}
      view={view}
    />
  );
}
