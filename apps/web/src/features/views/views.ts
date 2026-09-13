import type { MediaType } from "@/integrations/seerr/client";

/**
 * A view is a saved filter shown in the sidebar. These are hard-coded until views become
 * user-editable; `tone` is the card background used when no artwork applies.
 */
export type View =
  | Readonly<{
      kind: "media";
      id: string;
      label: string;
      description: string;
      mediaType: MediaType;
      tone: string;
    }>
  | Readonly<{
      kind: "provider";
      id: string;
      label: string;
      /** TMDB watch provider id, as listed by Seerr's `/watchproviders` endpoints. */
      watchProviderId: number;
      tone: string;
    }>;

export const views: readonly View[] = [
  {
    kind: "media",
    id: "movies",
    label: "Movies",
    description: "Everything · all platforms",
    mediaType: "movie",
    tone: "linear-gradient(135deg, #0b1a3f, #3b82f6)",
  },
  {
    kind: "media",
    id: "tv",
    label: "TV Shows",
    description: "Everything · all networks",
    mediaType: "tv",
    tone: "linear-gradient(135deg, #2e1065, #a855f7)",
  },
  {
    kind: "provider",
    id: "netflix",
    label: "Netflix",
    watchProviderId: 8,
    tone: "linear-gradient(180deg, #2a0a0d, #140507)",
  },
  {
    kind: "provider",
    id: "disney-plus",
    label: "Disney+",
    watchProviderId: 337,
    tone: "linear-gradient(180deg, #0b1f5c, #071238)",
  },
];

export const defaultViewId = "movies";

export function findView(id: string): View | undefined {
  return views.find((view) => view.id === id);
}
