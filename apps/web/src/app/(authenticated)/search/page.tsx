import { Suspense } from "react";

import { SearchPage } from "@/features/search/SearchPage";
import { parsePageNumber } from "@/platform/pageNumber";

import Loading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Search" };

async function Search({ searchParams }: PageProps<"/search">) {
  const query = await searchParams;
  const search = Array.isArray(query.q) ? query.q[0] : query.q;

  return <SearchPage page={parsePageNumber(query.page)} query={(search ?? "").trim()} />;
}

export default function Page(properties: PageProps<"/search">) {
  return (
    <Suspense fallback={<Loading />}>
      <Search {...properties} />
    </Suspense>
  );
}
