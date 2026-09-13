import { Layer, ManagedRuntime } from "effect";

import { ViewStore } from "@/features/views/viewStore";
import { SeerrClient } from "@/integrations/seerr/client";

/**
 * Process-wide runtime for running Effect programs from server components, actions and route
 * handlers. Configuration is read from the process environment when the layer is first built.
 */
export const appRuntime = ManagedRuntime.make(
  Layer.mergeAll(SeerrClient.Default, ViewStore.Default),
);
