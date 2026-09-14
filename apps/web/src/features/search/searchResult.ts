import { titleFromResult } from "@/features/title/title";

import type { GenreNames, Title } from "@/features/title/title";
import type { MediaResult } from "@/integrations/seerr/schemas";

export type SearchItem =
  | Title
  | Readonly<{
      mediaType: "person";
      id: number;
      name: string;
      posterPath: string | undefined;
      knownFor: string;
    }>;

export function searchItem(result: MediaResult, genres: GenreNames): SearchItem {
  return result.mediaType === "person"
    ? {
        mediaType: "person",
        id: result.id,
        name: result.name,
        posterPath: result.profilePath ?? undefined,
        knownFor: (result.knownFor ?? [])
          .map((title) => (title.mediaType === "movie" ? title.title : title.name))
          .join(", "),
      }
    : titleFromResult(result, genres);
}

export function searchItemHref(
  item: SearchItem,
): `/person/${number}` | `/title/${"movie" | "tv"}/${number}` {
  return item.mediaType === "person" ? `/person/${item.id}` : `/title/${item.mediaType}/${item.id}`;
}
