import { parsePageNumber } from "@/features/browse/pageNumber";
import { SearchPage } from "@/features/search/SearchPage";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Search" };

export default async function Page({ searchParams }: PageProps<"/search">) {
  const query = await searchParams;
  const search = Array.isArray(query.q) ? query.q[0] : query.q;

  return <SearchPage page={parsePageNumber(query.page)} query={(search ?? "").trim()} />;
}
