"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { Effect, Redacted, Schema } from "effect";

import { SeerrAuth } from "@/integrations/seerr/auth";
import { sessionCookieName } from "@/platform/auth/session";
import { appRuntime } from "@/platform/runtime";

const LocalCredentials = Schema.Struct({
  email: Schema.Trimmed.check(Schema.isNonEmpty()),
  password: Schema.NonEmptyString,
});
const PlexCredentials = Schema.Struct({ authToken: Schema.NonEmptyString });

type LoginError = Readonly<{ message: string }>;
type Credentials = Parameters<(typeof SeerrAuth.Service)["login"]>[0];

async function signIn(credentials: Credentials): Promise<LoginError> {
  const result = await appRuntime.runPromise(
    Effect.flatMap(SeerrAuth, (auth) => auth.login(credentials)).pipe(Effect.result),
  );

  if (result._tag === "Failure") {
    const error = result.failure;

    if (error._tag === "SeerrRejected") {
      return {
        message:
          credentials.kind === "local"
            ? "Sign-in failed. Check your Seerr email and password, and that local sign-in is enabled."
            : "Seerr did not allow this Plex account to sign in. Check your access with the administrator.",
      };
    }

    return {
      message:
        error._tag === "SeerrUnavailable"
          ? "Seerr could not be reached. Try signing in again."
          : "Seerr returned an invalid sign-in response. Ask the administrator to check its configuration.",
    };
  }

  const requestHeaders = await headers();
  (await cookies()).set(sessionCookieName, Redacted.value(result.success.session), {
    httpOnly: true,
    secure: requestHeaders.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    path: "/",
    expires: result.success.expires,
  });

  return redirect("/");
}

export async function localLogin(
  _previous: LoginError | undefined,
  formData: FormData,
): Promise<LoginError> {
  const input = Schema.decodeUnknownResult(LocalCredentials)(Object.fromEntries(formData));

  if (input._tag === "Failure") {
    return { message: "Enter your Seerr email address and password." };
  }

  return signIn({
    kind: "local",
    email: input.success.email,
    password: Redacted.make(input.success.password),
  });
}

export async function plexLogin(
  _previous: LoginError | undefined,
  formData: FormData,
): Promise<LoginError> {
  const input = Schema.decodeUnknownResult(PlexCredentials)(Object.fromEntries(formData));

  if (input._tag === "Failure") {
    return { message: "Complete Plex sign-in and try again." };
  }

  return signIn({ kind: "plex", token: Redacted.make(input.success.authToken) });
}

export async function logout(): Promise<LoginError> {
  const jar = await cookies();
  const value = jar.get(sessionCookieName)?.value;

  if (value) {
    const result = await appRuntime.runPromise(
      Effect.flatMap(SeerrAuth, (auth) => auth.logout(Redacted.make(value))).pipe(Effect.result),
    );

    if (result._tag === "Failure") {
      return { message: "Seerr could not sign you out. Try again." };
    }
  }

  jar.delete(sessionCookieName);

  return redirect("/login");
}
