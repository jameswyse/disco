import { Context } from "effect";

import type { SeerrUserId } from "./schemas";

/** CSRF credentials issued together by Seerr, including when verifying a session. */
export type SeerrCsrf = Readonly<{ cookie: string; token: string }>;

/** Supplied per operation after verifying the visitor's Seerr session. Never process-wide. */
export class SeerrIdentity extends Context.Tag("SeerrIdentity")<
  SeerrIdentity,
  Readonly<{ userId: SeerrUserId; csrf?: SeerrCsrf | undefined }>
>() {}

export function csrfHeaders(csrf: SeerrCsrf | undefined): Readonly<Record<string, string>> {
  return csrf === undefined
    ? {}
    : { Cookie: `_csrf=${encodeURIComponent(csrf.cookie)}`, "X-XSRF-TOKEN": csrf.token };
}
