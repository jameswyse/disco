"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { Effect, Redacted, Schema } from "effect";

import { SeerrAuth } from "@/integrations/seerr/auth";
import { sessionCookieName } from "@/platform/auth/session";
import { appRuntime } from "@/platform/runtime";

const LocalCredentials = Schema.Struct({
  email: Schema.NonEmptyTrimmedString,
  password: Schema.NonEmptyString,
});
const PlexCredentials = Schema.Struct({ authToken: Schema.NonEmptyString });

type LoginError = Readonly<{ message: string }>;
type Credentials = Parameters<SeerrAuth["login"]>[0];

async function signIn(credentials: Credentials): Promise<LoginError> {
  const result = await appRuntime.runPromise(
    Effect.flatMap(SeerrAuth, (auth) => auth.login(credentials)).pipe(Effect.either),
  );

  if (result._tag === "Left") {
    const error = result.left;

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
  (await cookies()).set(sessionCookieName, Redacted.value(result.right.session), {
    httpOnly: true,
    secure: requestHeaders.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    path: "/",
    expires: result.right.expires,
  });

  return redirect("/");
}

export async function localLogin(
  _previous: LoginError | undefined,
  formData: FormData,
): Promise<LoginError> {
  const input = Schema.decodeUnknownEither(LocalCredentials)(Object.fromEntries(formData));

  if (input._tag === "Left") {
    return { message: "Enter your Seerr email address and password." };
  }

  return signIn({
    kind: "local",
    email: input.right.email,
    password: Redacted.make(input.right.password),
  });
}

export async function plexLogin(
  _previous: LoginError | undefined,
  formData: FormData,
): Promise<LoginError> {
  const input = Schema.decodeUnknownEither(PlexCredentials)(Object.fromEntries(formData));

  if (input._tag === "Left") {
    return { message: "Complete Plex sign-in and try again." };
  }

  return signIn({ kind: "plex", token: Redacted.make(input.right.authToken) });
}

export async function logout(): Promise<LoginError> {
  const jar = await cookies();
  const value = jar.get(sessionCookieName)?.value;

  if (value) {
    const result = await appRuntime.runPromise(
      Effect.flatMap(SeerrAuth, (auth) => auth.logout(Redacted.make(value))).pipe(Effect.either),
    );

    if (result._tag === "Left") {
      return { message: "Seerr could not sign you out. Try again." };
    }
  }

  jar.delete(sessionCookieName);

  return redirect("/login");
}
