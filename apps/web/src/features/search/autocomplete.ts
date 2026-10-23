"use server";
import { Schema } from "effect";

import { requireSession, runWithSession } from "@/platform/auth/session";

import { searchProgram } from "./loadSearch";

const decodeQuery = Schema.decodeUnknownSync(
  Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(300))),
);

export async function autocomplete(query: string) {
  const session = await requireSession();
  const result = await runWithSession(session, searchProgram(decodeQuery(query).trim(), 1));

  return result.kind === "ok" ? { ...result, items: result.items.slice(0, 6) } : result;
}
