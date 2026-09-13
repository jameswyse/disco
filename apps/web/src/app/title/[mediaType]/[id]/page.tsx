import { notFound } from "next/navigation";

import { loadTitleDetails } from "@/features/title/loadTitleDetails";
import { TitleDetailsPage } from "@/features/title/TitleDetailsPage";
import { isMediaType, parseTmdbId } from "@/features/title/titleRoute";

import type { Metadata } from "next";

type TitlePageProperties = PageProps<"/title/[mediaType]/[id]">;

async function resolveTitle({ params }: TitlePageProperties) {
  const { mediaType, id } = await params;
  const tmdbId = parseTmdbId(id);

  if (!isMediaType(mediaType) || tmdbId === undefined) {
    notFound();
  }

  const result = await loadTitleDetails(mediaType, tmdbId);

  if (result.kind === "not-found") {
    notFound();
  }

  return result;
}

export async function generateMetadata(properties: TitlePageProperties): Promise<Metadata> {
  const result = await resolveTitle(properties);

  return { title: result.kind === "ok" ? result.details.name : "Title" };
}

export default async function Page(properties: TitlePageProperties) {
  const result = await resolveTitle(properties);

  return <TitleDetailsPage result={result} />;
}
