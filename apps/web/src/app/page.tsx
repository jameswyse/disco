import { BrowsePage } from "@/features/browse/BrowsePage";
import { parseDiscoverListId } from "@/features/browse/discoverLists";

export default async function Page({ searchParams }: PageProps<"/">) {
  const listId = parseDiscoverListId((await searchParams).list);

  return <BrowsePage listId={listId} />;
}
