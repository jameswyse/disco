import { Schema } from "effect";

import type { TitleDetails } from "./titleDetails";

const OptionalText = Schema.optional(Schema.String);
const OptionalNumber = Schema.optional(Schema.Number);

/** The subset of `TitleDetails` the title hover card needs, validated when it crosses the wire. */
export const TitlePreview = Schema.Struct({
  name: Schema.String,
  year: OptionalNumber,
  overview: Schema.String,
  backdropPath: OptionalText,
  trailerEmbedUrl: OptionalText,
  seriesType: OptionalText,
  runtimeMinutes: OptionalNumber,
  episodeCount: OptionalNumber,
  certification: OptionalText,
  originalLanguage: OptionalText,
  country: OptionalText,
  genres: Schema.Array(Schema.String),
  onWatchlist: Schema.Boolean,
  cast: Schema.Array(
    Schema.Struct({ id: Schema.Number, name: Schema.String, profilePath: OptionalText }),
  ),
  credits: Schema.Array(Schema.String),
  creators: Schema.Array(Schema.String),
  directors: Schema.Array(Schema.String),
  scores: Schema.Struct({
    tmdb: OptionalNumber,
    rottenTomatoes: OptionalNumber,
    imdb: OptionalNumber,
  }),
});
export type TitlePreview = typeof TitlePreview.Type;

export const decodeTitlePreview = Schema.decodeUnknownEither(TitlePreview);

function defined<Value>(value: Value | undefined): value is Value {
  return value !== undefined;
}

export function titlePreviewFromDetails(details: TitleDetails): TitlePreview {
  return {
    name: details.name,
    year: details.year,
    overview: details.overview,
    backdropPath: details.backdropPath,
    trailerEmbedUrl: details.trailerEmbedUrl,
    seriesType: details.seriesType,
    runtimeMinutes: details.runtimeMinutes,
    episodeCount: details.episodeCount,
    certification: details.certification,
    originalLanguage: details.originalLanguage,
    country: details.countries[0],
    genres: details.genres,
    onWatchlist: details.onWatchlist,
    cast: details.cast.slice(0, 4).map((person) => ({
      id: person.id,
      name: person.name,
      profilePath: person.profilePath,
    })),
    credits: [...details.networks.map((network) => network.name), ...details.companies].slice(0, 3),
    creators: details.creators.slice(0, 2),
    directors: details.directors.slice(0, 2),
    scores: {
      tmdb: details.scores.tmdb?.score,
      rottenTomatoes: details.scores.rottenTomatoes?.critics,
      imdb: details.scores.imdb?.score,
    },
  };
}

/** JSON drops `undefined` properties, so serialise only defined ones for a stable payload. */
export function serialisePreview(preview: TitlePreview): string {
  return JSON.stringify(preview, (_key, value: unknown) => (defined(value) ? value : undefined));
}
