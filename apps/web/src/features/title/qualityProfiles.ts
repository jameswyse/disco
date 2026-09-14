import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";

import type { MediaType } from "@/integrations/seerr/client";
import type { SeerrIdentity } from "@/integrations/seerr/identity";

export type QualityProfile = Readonly<{
  key: string;
  name: string;
  serverName: string;
  serverId: number;
  profileId: number;
  is4k: boolean;
  isDefault: boolean;
}>;

export function requestProfiles(mediaType: MediaType) {
  return Effect.gen(function* () {
    const client = yield* SeerrClient;
    const user = yield* client.currentUser();
    // Match Seerr's advanced-request controls: admin, manage requests, or advanced requests.
    const canChoose = ((user.permissions ?? 0) & (2 | 16 | 8192)) !== 0;

    if (!canChoose) {
      const profiles: readonly QualityProfile[] = [];

      return { canChoose, profiles };
    }

    const servers = yield* client.requestServers(mediaType);
    const profiles = yield* Effect.all(
      servers.map((server) =>
        client.serviceProfiles(mediaType, server.id).pipe(
          Effect.map((result) =>
            result.profiles.map((profile): QualityProfile => ({
              key: `${server.id}:${profile.id}`,
              name: profile.name,
              serverName: server.name,
              serverId: server.id,
              profileId: profile.id,
              is4k: server.is4k,
              isDefault: server.isDefault && server.activeProfileId === profile.id,
            })),
          ),
        ),
      ),
      { concurrency: 4 },
    );

    return { canChoose, profiles: profiles.flat() };
  });
}

export function requestedProfileName(
  mediaType: MediaType,
  request: Readonly<{
    profileName?: string | null | undefined;
    profileId?: number | null | undefined;
    serverId?: number | null | undefined;
  }>,
): Effect.Effect<string | undefined, never, SeerrClient | SeerrIdentity> {
  if (request.profileName) {
    return Effect.succeed(request.profileName);
  }

  const profileId = request.profileId ?? undefined;
  const serverId = request.serverId ?? undefined;

  if (profileId === undefined) {
    return Effect.succeed(undefined);
  }

  const fallback = `Profile #${profileId}`;

  if (serverId === undefined) {
    return Effect.succeed(fallback);
  }

  return Effect.flatMap(SeerrClient, (client) => client.serviceProfiles(mediaType, serverId)).pipe(
    Effect.map(
      (result) => result.profiles.find((profile) => profile.id === profileId)?.name ?? fallback,
    ),
    Effect.tapError((error) =>
      Effect.logWarning("Requested quality profile name unavailable", error),
    ),
    Effect.catchAll(() => Effect.succeed(fallback)),
  );
}
