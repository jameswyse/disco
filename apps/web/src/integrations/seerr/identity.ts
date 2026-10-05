import { Context } from "effect";

import type { SeerrUserId } from "./schemas";

export type SeerrCsrf = Readonly<{ cookie: string; token: string }>;

export class SeerrIdentity extends Context.Service<
  SeerrIdentity,
  Readonly<{ userId: SeerrUserId; csrf?: SeerrCsrf | undefined }>
>()("SeerrIdentity") {}

export function csrfHeaders(csrf: SeerrCsrf | undefined): Readonly<Record<string, string>> {
  return csrf === undefined
    ? {}
    : { Cookie: `_csrf=${encodeURIComponent(csrf.cookie)}`, "X-XSRF-TOKEN": csrf.token };
}
