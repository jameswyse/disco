"use server";
import { Schema } from "effect";

import { loadSearch } from "./loadSearch";

const decodeQuery = Schema.decodeUnknownSync(
  Schema.String.pipe(Schema.minLength(1), Schema.maxLength(300)),
);

export async function autocomplete(query: string) {
  const result = await loadSearch(decodeQuery(query).trim(), 1);

  return result.kind === "ok" ? { ...result, items: result.items.slice(0, 6) } : result;
}
