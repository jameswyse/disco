import { discoverListLabels } from "./discoverLists";

import type { View } from "@/features/views/views";

import type { DiscoverListId } from "./discoverLists";

export function browseListLabel(view: View, list: DiscoverListId): string {
  return list === "upcoming" && view.source.kind === "provider"
    ? "Upcoming originals"
    : discoverListLabels[list];
}
