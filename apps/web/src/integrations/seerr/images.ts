/**
 * Seerr serves TMDB image paths; the browser loads them from TMDB's CDN, as Seerr's own UI does
 * when image caching is disabled.
 */
const tmdbImageOrigin = "https://image.tmdb.org/t/p/";

export type PosterSize = "w185" | "w342" | "w500";
export type BackdropSize = "w780" | "w1280";
export type LogoSize = "w92" | "w154";

export function tmdbImageUrl(size: PosterSize | BackdropSize | LogoSize, path: string): string {
  return `${tmdbImageOrigin}${size}${path}`;
}

/** A backdrop recoloured by TMDB's CDN into a two-colour tint, used for the media view cards. */
export function tmdbDuotoneBackdropUrl(path: string, dark: string, light: string): string {
  return `${tmdbImageOrigin}w780_filter(duotone,${dark},${light})${path}`;
}

/**
 * Network and studio wordmarks on TMDB are often black on transparent. TMDB's CDN can recolour
 * them; a white duotone keeps them legible on Disco's dark cards.
 */
export function tmdbWordmarkUrl(path: string): string {
  return `${tmdbImageOrigin}w300_filter(duotone,ffffff,bababa)${path}`;
}
