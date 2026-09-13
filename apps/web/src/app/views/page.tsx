import { parseLibraryCategory } from "@/features/views/loadLibraryPage";
import { ViewLibraryPage } from "@/features/views/ViewLibraryPage";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add a view" };

export default async function Page({ searchParams }: PageProps<"/views">) {
  const query = await searchParams;
  const search = Array.isArray(query.q) ? query.q[0] : query.q;

  return (
    <ViewLibraryPage
      category={parseLibraryCategory(query.category)}
      query={(search ?? "").trim()}
    />
  );
}
