import { Schema } from "effect";

import type { MediaType } from "@/integrations/seerr/client";

/** What a view filters on. Ids are TMDB ids as exposed through Seerr. */
export const ViewSource = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("media"), mediaType: Schema.Literal("movie", "tv") }),
  Schema.Struct({ kind: Schema.Literal("provider"), providerId: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal("network"), networkId: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal("studio"), companyId: Schema.Number }),
  Schema.Struct({
    kind: Schema.Literal("genre"),
    movieGenreId: Schema.optional(Schema.Number),
    tvGenreId: Schema.optional(Schema.Number),
  }),
  Schema.Struct({ kind: Schema.Literal("language"), language: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("keyword"), keywordId: Schema.Number }),
);
export type ViewSource = typeof ViewSource.Type;

/** A saved filter shown in the sidebar. */
export const View = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  source: ViewSource,
  /** TMDB logo path for provider, network and studio views. */
  logoPath: Schema.optional(Schema.String),
  /** TMDB backdrop path used as card artwork. */
  backdropPath: Schema.optional(Schema.String),
});
export type View = typeof View.Type;
/** A view under construction, before it is frozen into the saved list. */
export type MutableView = { -readonly [Key in keyof View]: View[Key] };

export const defaultViews: readonly View[] = [
  { id: "movies", label: "Movies", source: { kind: "media", mediaType: "movie" } },
  { id: "tv", label: "TV Shows", source: { kind: "media", mediaType: "tv" } },
  {
    id: "netflix",
    label: "Netflix",
    source: { kind: "provider", providerId: 8 },
    logoPath: "/rK1KljqmbvO9HQa1PBFLILWah72.png",
  },
  {
    id: "disney-plus",
    label: "Disney+",
    source: { kind: "provider", providerId: 337 },
    logoPath: "/5eZ872CghnHFLB1j8grszbrx0dx.png",
  },
];

/** Media types a view can show. Networks are series-only and studios are film-only on TMDB. */
export function viewMediaTypes(view: View): readonly MediaType[] {
  const { source } = view;

  switch (source.kind) {
    case "media":
      return [source.mediaType];
    case "network":
      return ["tv"];
    case "studio":
      return ["movie"];
    case "genre":
      return [
        ...(source.movieGenreId === undefined ? [] : (["movie"] as const)),
        ...(source.tvGenreId === undefined ? [] : (["tv"] as const)),
      ];
    case "provider":
    case "language":
    case "keyword":
      return ["movie", "tv"];

    default: {
      const unsupportedSource: never = source;

      return unsupportedSource;
    }
  }
}

/** Two sources are the same when they filter on the same thing, regardless of label. */
export function sameSource(a: ViewSource, b: ViewSource): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function viewDescription(view: View): string | undefined {
  switch (view.source.kind) {
    case "media":
      return view.source.mediaType === "movie"
        ? "Everything · all platforms"
        : "Everything · all networks";
    case "provider":
      return "Streaming service";
    case "network":
      return "Network";
    case "studio":
      return "Studio";
    case "genre":
      return "Genre";
    case "language":
      return "Language";
    case "keyword":
      return "Keyword";

    default: {
      const unsupportedSource: never = view.source;

      return unsupportedSource;
    }
  }
}

const slugPattern = /[^a-z0-9]+/g;

export function slugify(label: string): string {
  const slug = label.toLowerCase().replace(slugPattern, "-").replace(/^-|-$/g, "");

  return slug === "" ? "view" : slug;
}

/** Route-safe id for a new view that does not collide with existing ones. */
export function uniqueViewId(label: string, existing: readonly View[]): string {
  const base = slugify(label);
  const taken = new Set(existing.map((view) => view.id));

  if (!taken.has(base)) {
    return base;
  }

  let suffix = 2;

  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}
