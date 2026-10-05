import { Context, Effect, Layer, Redacted } from "effect";
import { FetchHttpClient, HttpBody, HttpClient, HttpClientResponse } from "effect/http";

import { seerrEnvironmentConfig } from "@/platform/configuration/seerrEnvironment";

import { SeerrMalformed, SeerrRejected, translateHttpError } from "./errors";
import { csrfHeaders } from "./identity";
import { CurrentUser, LoginSettings } from "./schemas";

import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";

import type { SeerrCsrf } from "./identity";

function responseCsrf(response: HttpClientResponse.HttpClientResponse): SeerrCsrf | undefined {
  const csrfCookieName = "_csrf";
  const secret = response.cookies.cookies[csrfCookieName];
  const token = response.cookies.cookies["XSRF-TOKEN"];

  return secret && token ? { cookie: secret.value, token: token.value } : undefined;
}

export class SeerrAuth extends Context.Service<SeerrAuth>()("SeerrAuth", {
  make: Effect.gen(function* () {
    const environment = yield* seerrEnvironmentConfig;
    const base = new URL("api/v1/", environment.origin);
    const http = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);

    const response = (
      path: string,
      request: Effect.Effect<
        HttpClientResponse.HttpClientResponse,
        HttpClientError.HttpClientError
      >,
    ) => request.pipe(Effect.mapError((error) => translateHttpError(path, error)));

    const decode = <A, I>(
      path: string,
      schema: Schema.Codec<A, I>,
      incoming: HttpClientResponse.HttpClientResponse,
    ) =>
      HttpClientResponse.schemaBodyJson(schema)(incoming).pipe(
        Effect.mapError(
          () => new SeerrMalformed({ path, description: "Invalid authentication response." }),
        ),
      );

    const sessionHeaders = (session: Redacted.Redacted, csrf?: SeerrCsrf) => ({
      ...csrfHeaders(csrf),
      Cookie: `connect.sid=${encodeURIComponent(Redacted.value(session))}${csrf ? `; _csrf=${encodeURIComponent(csrf.cookie)}` : ""}`,
    });

    const verify = (session: Redacted.Redacted) =>
      Effect.gen(function* () {
        const incoming = yield* response(
          "auth/me",
          http.get(new URL("auth/me", base), { headers: sessionHeaders(session) }),
        );

        const user = yield* decode("auth/me", CurrentUser, incoming);

        return { user, csrf: responseCsrf(incoming) };
      });

    return {
      verify,
      login: (
        credentials:
          | Readonly<{ kind: "local"; email: string; password: Redacted.Redacted }>
          | Readonly<{ kind: "plex"; token: Redacted.Redacted }>,
      ) =>
        Effect.gen(function* () {
          const initial = yield* response(
            "settings/public",
            http.get(new URL("settings/public", base)),
          );

          const settings = yield* decode("settings/public", LoginSettings, initial);

          const enabled =
            credentials.kind === "local"
              ? settings.localLogin
              : settings.mediaServerLogin && settings.mediaServerType === 1;

          if (!enabled) {
            return yield* new SeerrRejected({ path: `auth/${credentials.kind}`, status: 403 });
          }

          const path = `auth/${credentials.kind}`;

          const body =
            credentials.kind === "local"
              ? { email: credentials.email, password: Redacted.value(credentials.password) }
              : { authToken: Redacted.value(credentials.token) };

          const incoming = yield* response(
            path,
            http.post(new URL(path, base), {
              body: HttpBody.jsonUnsafe(body),
              headers: csrfHeaders(responseCsrf(initial)),
            }),
          );

          yield* decode(path, CurrentUser, incoming);
          const cookie = incoming.cookies.cookies["connect.sid"];

          if (!cookie) {
            return yield* new SeerrMalformed({
              path,
              description: "Seerr did not issue a session cookie.",
            });
          }

          return { session: Redacted.make(cookie.value), expires: cookie.options?.expires };
        }),
      logout: (session: Redacted.Redacted) =>
        Effect.gen(function* () {
          const verified = yield* verify(session).pipe(
            Effect.catchTag("SeerrRejected", (error) =>
              error.status === 401 || error.status === 403
                ? Effect.succeed(undefined)
                : Effect.fail(error),
            ),
          );

          if (verified === undefined) {
            return;
          }

          yield* response(
            "auth/logout",
            http.post(new URL("auth/logout", base), {
              headers: sessionHeaders(session, verified.csrf),
              body: HttpBody.jsonUnsafe({}),
            }),
          );
        }),
    };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(Layer.provide(FetchHttpClient.layer));
}
