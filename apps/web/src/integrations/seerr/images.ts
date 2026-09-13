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
