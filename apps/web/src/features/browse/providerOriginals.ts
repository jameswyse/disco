import type { MediaType } from "@/integrations/seerr/client";

type Production = Readonly<{ network: number; studio?: number }>;

const originals = new Map<number, Production>([
  [8, { network: 213, studio: 178464 }],
  [350, { network: 2552, studio: 194232 }],
  [337, { network: 2739 }],
  [119, { network: 1024, studio: 20580 }],
  [9, { network: 1024, studio: 20580 }],
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
