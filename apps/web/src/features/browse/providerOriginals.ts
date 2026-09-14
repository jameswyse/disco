import type { MediaType } from "@/integrations/seerr/client";

/** Verified TMDB production identities, separate from JustWatch availability providers. */
type Production = Readonly<{ network: number; studio?: number }>;
const originals = new Map<number, Production>([
  [8, { network: 213, studio: 178464 }], // Netflix
  [350, { network: 2552, studio: 194232 }], // Apple TV / Apple Studios
  [337, { network: 2739 }], // Disney+; Disney's film studios also make theatrical releases.
  [119, { network: 1024, studio: 20580 }], // Prime Video / Amazon Studios
  [9, { network: 1024, studio: 20580 }], // Prime Video's US provider identity
]);

export function providerOriginals(providerId: number, mediaType: MediaType) {
  const production = originals.get(providerId);

  if (production === undefined) {
    return undefined;
  }

  if (mediaType === "tv") {
    return { network: production.network };
  }

  return production.studio === undefined ? undefined : { studio: production.studio };
}
