import { notFound } from "next/navigation";

import { Suspense } from "react";

import { ContentState } from "@/features/feedback/ContentState";
import { DiscoLoader } from "@/features/feedback/DiscoLoader";
import { loadPerson } from "@/features/person/loadPerson";
import { PersonPage } from "@/features/person/PersonPage";
import { parseTmdbId } from "@/features/title/titleRoute";

async function Person({ params }: PageProps<"/person/[id]">) {
  const id = parseTmdbId((await params).id);

  if (id === undefined) {
    notFound();
  }

  const result = await loadPerson(id);

  if (result.kind === "not-found") {
    notFound();
  }

  return result.kind === "error" ? (
    <ContentState title="Person couldn’t be loaded" message={result.message} retry />
  ) : (
    <PersonPage result={result} />
  );
}

export default function Page(properties: PageProps<"/person/[id]">) {
  return (
    <Suspense fallback={<DiscoLoader />}>
      <Person {...properties} />
    </Suspense>
  );
}
