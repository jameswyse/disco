import { connection } from "next/server";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { tmdbImageUrl } from "@/integrations/seerr/images";
import { seerrRuntime } from "@/integrations/seerr/runtime";

import { views } from "./views";

export type SidebarData =
  | Readonly<{
      kind: "ok";
      user: Readonly<{ displayName: string; avatarUrl: string | undefined }>;
      requests: Readonly<{ pending: number; processing: number }>;
      /** Provider logo URL by view id, for provider views whose logo Seerr knows. */
      providerLogos: Readonly<Record<string, string>>;
      seerrOrigin: string;
    }>
  | Readonly<{ kind: "error"; message: string }>;

const sidebarProgram = Effect.gen(function* () {
  const client = yield* SeerrClient;
  const settings = yield* client.publicSettings();
  const region = settings.streamingRegion || settings.discoverRegion || "US";
  const [user, requests, movieProviders, tvProviders] = yield* Effect.all(
    [
      client.currentUser(),
      client.requestCount(),
      client.watchProviders("movie", region),
      client.watchProviders("tv", region),
    ],
    { concurrency: "unbounded" },
  );
  const logoByProviderId = new Map(
    [...movieProviders, ...tvProviders].flatMap((provider): [number, string][] =>
      provider.logoPath ? [[provider.id, tmdbImageUrl("w154", provider.logoPath)]] : [],
    ),
  );
  const providerLogos: Record<string, string> = {};

  for (const view of views) {
    const logo = view.kind === "provider" ? logoByProviderId.get(view.watchProviderId) : undefined;

    if (logo !== undefined) {
      providerLogos[view.id] = logo;
    }
  }

  return {
    kind: "ok",
    user: { displayName: user.displayName, avatarUrl: user.avatar ?? undefined },
    requests: { pending: requests.pending, processing: requests.processing },
    providerLogos,
    seerrOrigin: client.origin.origin,
  } satisfies SidebarData;
});

export async function loadSidebar(): Promise<SidebarData> {
  // Seerr data is request-time; opting in explicitly keeps the Effect runtime's clock access out
  // of the static prerender.
  await connection();

  return seerrRuntime.runPromise(
    sidebarProgram.pipe(
      Effect.tapError((error) => Effect.logError("Seerr sidebar request failed", error)),
      Effect.catchAll((error) =>
        Effect.succeed<SidebarData>({ kind: "error", message: describeSeerrError(error) }),
      ),
    ),
  );
}
