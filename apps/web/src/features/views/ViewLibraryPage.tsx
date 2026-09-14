import { loadLibraryPage } from "./loadLibraryPage";
import { ViewLibrary } from "./ViewLibrary";

import type { LibraryCategory } from "./libraryFilters";

export async function ViewLibraryPage({
  category,
  query,
  country,
}: Readonly<{
  category: LibraryCategory;
  query: string;
  country: string | undefined;
}>) {
  const data = await loadLibraryPage(category, query, country);

  return <ViewLibrary category={category} query={query} data={data} />;
}
