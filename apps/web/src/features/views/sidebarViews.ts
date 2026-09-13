/**
 * Placeholder sidebar views until saved views are loaded from Seerr and user preferences.
 * `tone` is a CSS background used in place of the artwork Seerr will supply later.
 */
export type SidebarView =
  | Readonly<{
      kind: "media";
      id: string;
      label: string;
      description: string;
      tone: string;
    }>
  | Readonly<{
      kind: "provider";
      id: string;
      label: string;
      tone: string;
      hasNewTitles: boolean;
    }>;

export const placeholderSidebarViews: readonly SidebarView[] = [
  {
    kind: "media",
    id: "movies",
    label: "Movies",
    description: "Everything · all platforms",
    tone: "linear-gradient(135deg, #0b1a3f, #3b82f6)",
  },
  {
    kind: "media",
    id: "tv",
    label: "TV Shows",
    description: "Everything · all networks",
    tone: "linear-gradient(135deg, #2e1065, #a855f7)",
  },
  {
    kind: "provider",
    id: "netflix",
    label: "Netflix",
    tone: "linear-gradient(180deg, #2a0a0d, #140507)",
    hasNewTitles: true,
  },
  {
    kind: "provider",
    id: "disney-plus",
    label: "Disney+",
    tone: "linear-gradient(180deg, #0b1f5c, #071238)",
    hasNewTitles: false,
  },
  {
    kind: "provider",
    id: "prime-video",
    label: "Prime Video",
    tone: "linear-gradient(180deg, #0f2a44, #0a1c2e)",
    hasNewTitles: false,
  },
  {
    kind: "provider",
    id: "apple-tv-plus",
    label: "Apple TV+",
    tone: "linear-gradient(180deg, #1a1a1a, #000)",
    hasNewTitles: false,
  },
  {
    kind: "provider",
    id: "hbo",
    label: "HBO",
    tone: "linear-gradient(180deg, #1b1338, #0d0a1f)",
    hasNewTitles: true,
  },
  {
    kind: "provider",
    id: "a24",
    label: "A24",
    tone: "linear-gradient(180deg, #1e1e1e, #0c0c0c)",
    hasNewTitles: false,
  },
];

export const placeholderActiveViewId = "netflix";
