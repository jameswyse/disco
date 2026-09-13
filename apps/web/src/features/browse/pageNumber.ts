/** Resolve the `page` search parameter; anything other than a positive integer means page 1. */
export function parsePageNumber(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const page = candidate === undefined ? Number.NaN : Number(candidate);

  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}
