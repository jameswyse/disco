const tmdbImageOrigin = "https://image.tmdb.org/t/p/";
const absoluteImageUrl = /^https?:\/\//i;

export type PosterSize = "w185" | "w342" | "w500";
export type BackdropSize = "w780" | "w1280";
export type LogoSize = "w92" | "w154";

export function tmdbImageUrl(size: PosterSize | BackdropSize | LogoSize, path: string): string {
  return absoluteImageUrl.test(path) ? path : `${tmdbImageOrigin}${size}${path}`;
}

export function tmdbDuotoneBackdropUrl(path: string, dark: string, light: string): string {
  return `${tmdbImageOrigin}w780_filter(duotone,${dark},${light})${path}`;
}

export function tmdbWordmarkUrl(path: string): string {
  return `${tmdbImageOrigin}w300_filter(duotone,ffffff,bababa)${path}`;
}
