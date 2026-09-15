import { Layer, ManagedRuntime } from "effect";

import { SettingsStore } from "@/features/settings/settingsStore";
import { ViewStore } from "@/features/views/viewStore";
import { PlexLibrary } from "@/integrations/plex/library";
import { SeerrAuth } from "@/integrations/seerr/auth";
import { SeerrClient } from "@/integrations/seerr/client";

/**
 * Process-wide runtime for running Effect programs from server components, actions and route
 * handlers. Configuration is read from the process environment when the layer is first built.
 */
export const appRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    SeerrAuth.Default,
    SeerrClient.Default,
    PlexLibrary.Default,
    ViewStore.Default,
    SettingsStore.Default,
  ),
);
