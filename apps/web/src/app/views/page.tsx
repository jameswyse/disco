import { Suspense } from "react";

import { parseLibraryCategory } from "@/features/views/loadLibraryPage";
import { ViewLibraryPage } from "@/features/views/ViewLibraryPage";

import Loading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add a view" };

async function Library({ searchParams }: PageProps<"/views">) {
  const query = await searchParams;
  const search = Array.isArray(query.q) ? query.q[0] : query.q;

  return (
    <ViewLibraryPage
      category={parseLibraryCategory(query.category)}
      query={(search ?? "").trim()}
    />
  );
}

export default function Page(properties: PageProps<"/views">) {
  return (
    <Suspense fallback={<Loading />}>
      <Library {...properties} />
    </Suspense>
  );
}
