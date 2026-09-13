export type MediaType = "movie" | "tv";

export type Availability =
  | Readonly<{ kind: "not-in-library" }>
  | Readonly<{ kind: "available" }>
  | Readonly<{ kind: "partially-available" }>
  | Readonly<{ kind: "requested" }>
  | Readonly<{ kind: "pending" }>;

/** Placeholder catalogue entry until titles come from Seerr. `tone` stands in for poster art. */
export type PlaceholderTitle = Readonly<{
  id: number;
  mediaType: MediaType;
  title: string;
  year: number;
  rating: number;
  detail: string;
  genres: readonly string[];
  tone: string;
  availability: Availability;
}>;

export const placeholderTitles: readonly PlaceholderTitle[] = [
  {
    id: 1,
    mediaType: "tv",
    title: "Placeholder series one",
    year: 2025,
    rating: 8.0,
    detail: "S3",
    genres: ["Action", "Mystery"],
    tone: "linear-gradient(160deg, #7c2d12, #1c1917)",
    availability: { kind: "partially-available" },
  },
  {
    id: 2,
    mediaType: "tv",
    title: "Placeholder series two",
    year: 2024,
    rating: 9.0,
    detail: "S2",
    genres: ["Animation", "Action"],
    tone: "linear-gradient(160deg, #1e3a8a, #0f172a)",
    availability: { kind: "available" },
  },
  {
    id: 3,
    mediaType: "tv",
    title: "Placeholder limited series",
    year: 2025,
    rating: 8.2,
    detail: "Limited",
    genres: ["Drama", "Crime"],
    tone: "linear-gradient(160deg, #134e4a, #0f172a)",
    availability: { kind: "not-in-library" },
  },
  {
    id: 4,
    mediaType: "tv",
    title: "Placeholder series four",
    year: 2025,
    rating: 8.7,
    detail: "S5",
    genres: ["Action", "Mystery"],
    tone: "linear-gradient(160deg, #7f1d1d, #111827)",
    availability: { kind: "requested" },
  },
  {
    id: 5,
    mediaType: "movie",
    title: "Placeholder film one",
    year: 2025,
    rating: 8.4,
    detail: "1h 36m",
    genres: ["Fantasy", "Music"],
    tone: "linear-gradient(160deg, #6b21a8, #1e1b4b)",
    availability: { kind: "not-in-library" },
  },
  {
    id: 6,
    mediaType: "tv",
    title: "Placeholder series six",
    year: 2023,
    rating: 8.7,
    detail: "S1",
    genres: ["Action", "Animation"],
    tone: "linear-gradient(160deg, #9a3412, #1c1917)",
    availability: { kind: "available" },
  },
  {
    id: 7,
    mediaType: "tv",
    title: "Placeholder series seven",
    year: 2025,
    rating: 8.0,
    detail: "S2",
    genres: ["Sci-Fi", "Mystery"],
    tone: "linear-gradient(160deg, #1f2937, #030712)",
    availability: { kind: "pending" },
  },
  {
    id: 8,
    mediaType: "movie",
    title: "Placeholder film two",
    year: 2025,
    rating: 6.5,
    detail: "1h 58m",
    genres: ["Comedy"],
    tone: "linear-gradient(160deg, #365314, #0f172a)",
    availability: { kind: "not-in-library" },
  },
  {
    id: 9,
    mediaType: "tv",
    title: "Placeholder series nine",
    year: 2025,
    rating: 7.9,
    detail: "S1",
    genres: ["Drama", "Crime"],
    tone: "linear-gradient(160deg, #78350f, #1c1917)",
    availability: { kind: "not-in-library" },
  },
  {
    id: 10,
    mediaType: "movie",
    title: "Placeholder film three",
    year: 2025,
    rating: 7.2,
    detail: "2h 25m",
    genres: ["Thriller", "Mystery"],
    tone: "linear-gradient(160deg, #0c4a6e, #0f172a)",
    availability: { kind: "not-in-library" },
  },
  {
    id: 11,
    mediaType: "tv",
    title: "Placeholder series eleven",
    year: 2026,
    rating: 7.5,
    detail: "S2",
    genres: ["Sci-Fi", "Mystery"],
    tone: "linear-gradient(160deg, #312e81, #0f172a)",
    availability: { kind: "not-in-library" },
  },
  {
    id: 12,
    mediaType: "movie",
    title: "Placeholder film four",
    year: 2022,
    rating: 7.0,
    detail: "2h 20m",
    genres: ["Comedy", "Crime"],
    tone: "linear-gradient(160deg, #831843, #1e1b4b)",
    availability: { kind: "requested" },
  },
];

export function isMediaType(value: string): value is MediaType {
  return value === "movie" || value === "tv";
}

export function findPlaceholderTitle(
  mediaType: MediaType,
  id: number,
): PlaceholderTitle | undefined {
  return placeholderTitles.find((title) => title.mediaType === mediaType && title.id === id);
}

const mediaTypeLabels = { movie: "Film", tv: "TV" } as const satisfies Record<MediaType, string>;

export function mediaTypeLabel(mediaType: MediaType): string {
  return mediaTypeLabels[mediaType];
}
