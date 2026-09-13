import { ManagedRuntime } from "effect";

import { SeerrClient } from "./client";

/**
 * Process-wide runtime for running Seerr effects from server components and route handlers.
 * Configuration is read from the process environment when the layer is first built.
 */
export const seerrRuntime = ManagedRuntime.make(SeerrClient.Default);
