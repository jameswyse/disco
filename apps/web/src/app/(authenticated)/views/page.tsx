import { Suspense } from "react";

import { parseLibraryCategory } from "@/features/views/libraryFilters";
import { ViewLibraryPage } from "@/features/views/ViewLibraryPage";

import Loading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Manage views" };

async function Library({ searchParams }: PageProps<"/views">) {
  const query = await searchParams;
  const search = Array.isArray(query.q) ? query.q[0] : query.q;

  return (
    <ViewLibraryPage
      category={parseLibraryCategory(query.category)}
      country={Array.isArray(query.country) ? query.country[0] : query.country}
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
