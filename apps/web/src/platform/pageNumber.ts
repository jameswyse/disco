import { Schema } from "effect";

export const decodePageNumber = Schema.decodeUnknownSync(
  Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThan(0))),
);

export function parsePageNumber(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const page = candidate === undefined ? Number.NaN : Number(candidate);

  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}
