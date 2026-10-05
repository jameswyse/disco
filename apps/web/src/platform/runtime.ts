import { Layer, ManagedRuntime } from "effect";

import { SettingsStore } from "@/features/settings/settingsStore";
import { ViewStore } from "@/features/views/viewStore";
import { PlexLibrary } from "@/integrations/plex/library";
import { SeerrAuth } from "@/integrations/seerr/auth";
import { SeerrClient } from "@/integrations/seerr/client";

export const appRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    SeerrAuth.layer,
    SeerrClient.layer,
    PlexLibrary.layer,
    ViewStore.layer,
    SettingsStore.layer,
  ),
);
