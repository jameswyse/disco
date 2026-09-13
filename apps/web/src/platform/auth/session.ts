import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cache } from "react";

import { Effect, Redacted } from "effect";

import { SeerrAuth } from "@/integrations/seerr/auth";
import { describeSeerrError } from "@/integrations/seerr/errors";
import { SeerrIdentity } from "@/integrations/seerr/identity";

import { appRuntime } from "../runtime";

type RuntimeServices = Effect.Effect.Context<Parameters<typeof appRuntime.runPromise>[0]>;

export const sessionCookieName = "disco_session";

/** Only Seerr can validate its signed session. React deduplicates this within one request. */
export const readSession = cache(async () => {
  const value = (await cookies()).get(sessionCookieName)?.value;

  if (!value) {
    return undefined;
  }

  const session = Redacted.make(value);
  const result = await appRuntime.runPromise(
    Effect.flatMap(SeerrAuth, (auth) => auth.verify(session)).pipe(Effect.either),
  );

  if (result._tag === "Right") {
    return { ...result.right, session };
  }

  if (
    result.left._tag === "SeerrRejected" &&
    (result.left.status === 401 || result.left.status === 403)
  ) {
    return undefined;
  }

  throw new Error(describeSeerrError(result.left));
});

export async function requireSession() {
  const session = await readSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

/** Authorise at the operation boundary, including actions and route handlers. */
export async function runAuthenticated<A, E>(
  program: Effect.Effect<A, E, SeerrIdentity | RuntimeServices>,
): Promise<A> {
  const verified = await requireSession();

  return appRuntime.runPromise(
    program.pipe(
      Effect.provideService(SeerrIdentity, {
        userId: verified.user.id,
        csrf: verified.csrf,
      }),
    ),
  );
}
