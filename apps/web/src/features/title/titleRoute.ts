import type { MediaType } from "@/integrations/seerr/client";

export function isMediaType(value: string): value is MediaType {
  return value === "movie" || value === "tv";
}

export function parseTmdbId(value: string): number | undefined {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function titleHref(mediaType: MediaType, id: number): `/title/${MediaType}/${number}` {
  return `/title/${mediaType}/${id}`;
}
