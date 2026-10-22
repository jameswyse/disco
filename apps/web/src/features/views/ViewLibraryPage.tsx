import { loadSettings } from "@/features/settings/loadSettings";
import { defaultLogoStyle } from "@/features/settings/settings";

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
  const [data, settings] = await Promise.all([
    loadLibraryPage(category, query, country),
    loadSettings(),
  ]);

  return (
    <ViewLibrary
      category={category}
      query={query}
      data={data}
      logoStyle={settings.logoStyle ?? defaultLogoStyle}
    />
  );
}
