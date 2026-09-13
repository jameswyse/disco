import { notFound } from "next/navigation";

import { Suspense } from "react";

import { loadTitleDetails } from "@/features/title/loadTitleDetails";
import { TitleDetailsPage } from "@/features/title/TitleDetailsPage";
import { isMediaType, parseTmdbId } from "@/features/title/titleRoute";

import Loading from "../../../loading";

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

async function Title(properties: TitlePageProperties) {
  const result = await resolveTitle(properties);

  return <TitleDetailsPage result={result} />;
}

export default function Page(properties: TitlePageProperties) {
  return (
    <Suspense fallback={<Loading />}>
      <Title {...properties} />
    </Suspense>
  );
}
