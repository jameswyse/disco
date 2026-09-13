import { notFound } from "next/navigation";

import { findPlaceholderTitle, isMediaType } from "@/features/browse/placeholderTitles";
import { TitleDetailsPage } from "@/features/titleDetails/TitleDetailsPage";

import type { Metadata } from "next";

type TitlePageProperties = PageProps<"/title/[mediaType]/[id]">;

async function resolveTitle({ params }: TitlePageProperties) {
  const { mediaType, id } = await params;
  const numericId = Number(id);

  if (!isMediaType(mediaType) || !Number.isSafeInteger(numericId) || numericId <= 0) {
    notFound();
  }

  const title = findPlaceholderTitle(mediaType, numericId);

  if (!title) {
    notFound();
  }

  return title;
}

export async function generateMetadata(properties: TitlePageProperties): Promise<Metadata> {
  const title = await resolveTitle(properties);

  return { title: title.title };
}

export default async function Page(properties: TitlePageProperties) {
  const title = await resolveTitle(properties);

  return <TitleDetailsPage title={title} />;
}
