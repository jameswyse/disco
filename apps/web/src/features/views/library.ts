import { cacheLife } from "next/cache";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { SeerrIdentity } from "@/integrations/seerr/identity";
import { requireSession } from "@/platform/auth/session";
import { appRuntime } from "@/platform/runtime";

import type { SeerrUserId } from "@/integrations/seerr/schemas";

import type { ViewSource } from "./views";

/** Something a user can turn into a sidebar view. */
export type LibraryEntry = Readonly<{
  label: string;
  source: ViewSource;
  logoPath: string | undefined;
  backdropPath: string | undefined;
  note: string | undefined;
}>;

export type LibrarySection = "streaming" | "networks" | "studios" | "genres";

export type Library = Readonly<Record<LibrarySection, readonly LibraryEntry[]>>;

/** TMDB network ids shown by default; Seerr supplies current names and logos. */
const featuredNetworkIds = [
  213, 49, 2739, 1024, 2552, 453, 4330, 3353, 174, 4, 56, 80, 13, 19, 88, 67, 318, 2, 6, 16, 47,
  1112,
];
/** TMDB production company ids shown by default. */
const featuredStudioIds = [
  2, 3, 4, 33, 174, 420, 521, 1, 41077, 923, 1632, 10342, 3172, 90733, 10146, 12, 21, 43, 297, 6704,
  14, 25,
];
const libraryProgram = (region: string) =>
  Effect.gen(function* () {
    const client = yield* SeerrClient;
    const [movieProviders, tvProviders, networks, studios, movieGenres, tvGenres] =
      yield* Effect.all(
        [
          client.watchProviders("movie", region),
          client.watchProviders("tv", region),
          Effect.all(
            featuredNetworkIds.map((id) => client.network(id)),
            { concurrency: 6 },
          ),
          Effect.all(
            featuredStudioIds.map((id) => client.studio(id)),
            { concurrency: 6 },
          ),
          client.genreSlider("movie"),
          client.genreSlider("tv"),
        ],
        { concurrency: "unbounded" },
      );

    const providersById = new Map<number, LibraryEntry>();
    const movieProviderIds = new Set(movieProviders.map((provider) => provider.id));
    const tvProviderIds = new Set(tvProviders.map((provider) => provider.id));

    for (const provider of [...movieProviders, ...tvProviders].sort(
      (a, b) => (a.displayPriority ?? 0) - (b.displayPriority ?? 0),
    )) {
      if (!providersById.has(provider.id)) {
        let note = "Series";

        if (movieProviderIds.has(provider.id)) {
          note = tvProviderIds.has(provider.id) ? "Films & series" : "Films";
        }

        providersById.set(provider.id, {
          label: provider.name,
          source: { kind: "provider", providerId: provider.id },
          logoPath: provider.logoPath ?? undefined,
          backdropPath: undefined,
          note,
        });
      }
    }

    const genresByName = new Map<string, LibraryEntry>();

    for (const genre of movieGenres) {
      genresByName.set(genre.name, {
        label: genre.name,
        source: { kind: "genre", movieGenreId: genre.id },
        logoPath: undefined,
        backdropPath: genre.backdrops?.[0],
        note: "Films",
      });
    }

    for (const genre of tvGenres) {
      const existing = genresByName.get(genre.name);

      genresByName.set(genre.name, {
        label: genre.name,
        source:
          existing?.source.kind === "genre"
            ? { ...existing.source, tvGenreId: genre.id }
            : { kind: "genre", tvGenreId: genre.id },
        logoPath: undefined,
        backdropPath: existing?.backdropPath ?? genre.backdrops?.[0],
        note: existing ? "Films & series" : "Series",
      });
    }

    const library = {
      streaming: [...providersById.values()],
      networks: networks.map((network) => ({
        label: network.name,
        source: { kind: "network", networkId: network.id },
        logoPath: network.logoPath ?? undefined,
        backdropPath: undefined,
        note: undefined,
      })),
      studios: studios.map((studio) => ({
        label: studio.name,
        source: { kind: "studio", companyId: studio.id },
        logoPath: studio.logoPath ?? undefined,
        backdropPath: undefined,
        note: undefined,
      })),
      genres: [...genresByName.values()].sort((a, b) => a.label.localeCompare(b.label)),
    } satisfies Library;

    return library;
  });

/** The catalogue changes rarely and costs dozens of Seerr calls, so it is cached for a day. */

async function cachedLibrary(region: string, userId: SeerrUserId): Promise<Library> {
  "use cache";
  cacheLife("days");

  return appRuntime.runPromise(
    libraryProgram(region).pipe(
      Effect.provideService(SeerrIdentity, { userId }),
      Effect.tapError((error) => Effect.logError("Seerr catalogue request failed", error)),
      Effect.mapError((error) => new Error(describeSeerrError(error))),
    ),
  );
}

export async function loadLibrary(region: string): Promise<Library> {
  const { user } = await requireSession();

  return cachedLibrary(region, user.id);
}
