"use server";

import { Effect, Schema } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { runAuthenticated } from "@/platform/auth/session";

import type { SeasonDetails } from "@/integrations/seerr/schemas";

const SeasonInput = Schema.Struct({
  id: Schema.Number.pipe(Schema.int(), Schema.positive()),
  season: Schema.Number.pipe(Schema.int(), Schema.positive()),
});

export type SeasonEpisodesResult =
  | Readonly<{ kind: "ok"; episodes: SeasonDetails["episodes"] }>
  | Readonly<{ kind: "error"; message: string }>;

export async function loadSeasonEpisodes(
  _previous: SeasonEpisodesResult | undefined,
  input: typeof SeasonInput.Type,
): Promise<SeasonEpisodesResult> {
  const { id, season } = Schema.decodeUnknownSync(SeasonInput)(input);

  return runAuthenticated(
    Effect.flatMap(SeerrClient, (client) => client.tvSeason(id, season)).pipe(
      Effect.map((details): SeasonEpisodesResult => ({
        kind: "ok",
        episodes: details.episodes.slice().sort((a, b) => b.episodeNumber - a.episodeNumber),
      })),
      Effect.tapError((error) => Effect.logError("Seerr season request failed", error)),
      Effect.catchAll(() =>
        Effect.succeed<SeasonEpisodesResult>({
          kind: "error",
          message: "Episode information could not be loaded.",
        }),
      ),
    ),
  );
}
