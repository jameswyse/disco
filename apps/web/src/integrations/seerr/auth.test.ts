import { HttpClient, HttpClientResponse } from "@effect/platform";
import { ConfigProvider, Effect, Layer, Redacted, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { SeerrAuth } from "./auth";
import { LoginSettings } from "./schemas";

import type { HttpClientRequest } from "@effect/platform";

type Incoming = Readonly<{
  path: string;
  headers: Headers;
  body: HttpClientRequest.HttpClientRequest["body"];
}>;
type Stub = Readonly<{ body: unknown; status?: number; cookies?: readonly string[] }>;

function testAuth(respond: (request: Incoming) => Stub) {
  const http = HttpClient.make((request, url) =>
    Effect.sync(() => {
      const stub = respond({
        path: url.pathname,
        headers: new Headers(request.headers),
        body: request.body,
      });
      const headers = new Headers({ "content-type": "application/json" });

      for (const cookie of stub.cookies ?? []) {
        headers.append("set-cookie", cookie);
      }

      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(stub.body), { status: stub.status ?? 200, headers }),
      );
    }),
  );
  const layer = SeerrAuth.DefaultWithoutDependencies.pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
    Layer.provide(
      Layer.setConfigProvider(
        ConfigProvider.fromMap(
          new Map([
            ["SEERR_URL", "https://seerr.example.test"],
            ["SEERR_API_KEY", "must-not-be-sent"],
          ]),
        ),
      ),
    ),
  );

  return <A, E>(program: (auth: SeerrAuth) => Effect.Effect<A, E>) =>
    Effect.runPromise(Effect.flatMap(SeerrAuth, program).pipe(Effect.provide(layer)));
}

const localOnly = { localLogin: true, mediaServerLogin: false, mediaServerType: 1 };
const user = { id: 2, displayName: "Fixture User", avatar: null };
const csrfCookies = ["_csrf=secret; Path=/; HttpOnly", "XSRF-TOKEN=token; Path=/"];

describe("SeerrAuth", () => {
  it.each(["local", "plex"] as const)(
    "delegates %s sign-in with CSRF and keeps the issued Seerr session",
    async (kind) => {
      const run = testAuth(({ path, headers, body }) => {
        expect(headers.has("x-api-key")).toBe(false);
        expect(headers.has("x-api-user")).toBe(false);

        if (path === "/api/v1/settings/public") {
          return { body: { ...localOnly, mediaServerLogin: true }, cookies: csrfCookies };
        }

        expect(path).toBe(`/api/v1/auth/${kind}`);
        expect(headers.get("cookie")).toBe("_csrf=secret");
        expect(headers.get("x-xsrf-token")).toBe("token");
        expect(body._tag).toBe("Uint8Array");

        if (body._tag !== "Uint8Array") {
          throw new Error("Expected a JSON request body");
        }

        expect(JSON.parse(new TextDecoder().decode(body.body))).toEqual(
          kind === "local"
            ? { email: "fixture@example.test", password: "fixture-password" }
            : { authToken: "plex-token" },
        );

        return {
          body: user,
          cookies: [
            "connect.sid=s%3Aopaque.signature; Path=/; HttpOnly; Expires=Wed, 01 Jan 2031 00:00:00 GMT",
          ],
        };
      });

      const result = await run((auth) =>
        auth.login(
          kind === "local"
            ? { kind, email: "fixture@example.test", password: Redacted.make("fixture-password") }
            : { kind, token: Redacted.make("plex-token") },
        ),
      );

      expect(Redacted.value(result.session)).toBe("s:opaque.signature");
      expect(result.expires?.toISOString()).toBe("2031-01-01T00:00:00.000Z");
    },
  );

  it("rejects disabled sign-in methods before submitting credentials", async () => {
    const paths: string[] = [];
    const run = testAuth(({ path }) => {
      paths.push(path);

      return { body: localOnly };
    });
    const error = await run((auth) =>
      Effect.flip(auth.login({ kind: "plex", token: Redacted.make("token") })),
    );
    expect(error).toMatchObject({ _tag: "SeerrRejected", status: 403 });
    expect(paths).toEqual(["/api/v1/settings/public"]);
  });

  it("preserves Seerr's rejection of incorrect credentials", async () => {
    const run = testAuth(({ path }) =>
      path.endsWith("/public")
        ? { body: localOnly }
        : { status: 403, body: { message: "Invalid credentials" } },
    );
    const error = await run((auth) =>
      Effect.flip(
        auth.login({
          kind: "local",
          email: "fixture@example.test",
          password: Redacted.make("wrong"),
        }),
      ),
    );
    expect(error).toMatchObject({ _tag: "SeerrRejected", status: 403 });
  });

  it("does not authenticate when Seerr omits the session cookie", async () => {
    const run = testAuth(({ path }) => ({ body: path.endsWith("/public") ? localOnly : user }));
    const error = await run((auth) =>
      Effect.flip(
        auth.login({
          kind: "local",
          email: "fixture@example.test",
          password: Redacted.make("fixture-password"),
        }),
      ),
    );
    expect(error._tag).toBe("SeerrMalformed");
  });

  it("verifies the session alone and returns its user and CSRF credentials", async () => {
    const run = testAuth(({ path, headers }) => {
      expect(path).toBe("/api/v1/auth/me");
      expect(headers.get("cookie")).toBe("connect.sid=s%3Aopaque.signature");
      expect(headers.has("x-api-key")).toBe(false);

      return { body: user, cookies: csrfCookies };
    });
    expect(await run((auth) => auth.verify(Redacted.make("s:opaque.signature")))).toEqual({
      user,
      csrf: { cookie: "secret", token: "token" },
    });
  });

  it("rejects expired sessions without falling back to the API key", async () => {
    const run = testAuth(({ headers }) => {
      expect(headers.has("x-api-key")).toBe(false);

      return { status: 403, body: { message: "Forbidden" } };
    });
    const error = await run((auth) => Effect.flip(auth.verify(Redacted.make("expired"))));
    expect(error).toMatchObject({ _tag: "SeerrRejected", status: 403 });
  });

  it.each([401, 403])(
    "allows clearing a session that Seerr already rejects with %i",
    async (status) => {
      const paths: string[] = [];
      const run = testAuth(({ path }) => {
        paths.push(path);

        return { status, body: { message: "Session expired" } };
      });

      await expect(run((auth) => auth.logout(Redacted.make("expired")))).resolves.toBeUndefined();
      expect(paths).toEqual(["/api/v1/auth/me"]);
    },
  );

  it("preserves a rejected logout after Seerr verifies the session", async () => {
    const paths: string[] = [];
    const run = testAuth(({ path }) => {
      paths.push(path);

      return path.endsWith("/me")
        ? { body: user, cookies: csrfCookies }
        : { status: 403, body: { message: "Logout rejected" } };
    });
    const error = await run((auth) => Effect.flip(auth.logout(Redacted.make("session"))));

    expect(error).toMatchObject({ _tag: "SeerrRejected", path: "auth/logout", status: 403 });
    expect(paths).toEqual(["/api/v1/auth/me", "/api/v1/auth/logout"]);
  });

  it("logs out the verified Seerr session with its CSRF credentials", async () => {
    const paths: string[] = [];
    const run = testAuth(({ path, headers }) => {
      paths.push(path);
      expect(headers.has("x-api-key")).toBe(false);

      if (path.endsWith("/me")) {
        return { body: user, cookies: csrfCookies };
      }

      expect(headers.get("cookie")).toBe("connect.sid=session; _csrf=secret");
      expect(headers.get("x-xsrf-token")).toBe("token");

      return { body: {} };
    });
    await run((auth) => auth.logout(Redacted.make("session")));
    expect(paths).toEqual(["/api/v1/auth/me", "/api/v1/auth/logout"]);
  });
});

describe("Seerr login settings", () => {
  it.each([
    { localLogin: true, mediaServerLogin: true, mediaServerType: 1 },
    { localLogin: true, mediaServerLogin: false, mediaServerType: 1 },
    { localLogin: false, mediaServerLogin: true, mediaServerType: 1 },
    { localLogin: false, mediaServerLogin: true, mediaServerType: 2 },
  ])("accepts enabled authentication: %j", (settings) => {
    expect(Schema.decodeUnknownSync(LoginSettings)(settings)).toEqual(settings);
  });

  it("rejects both login methods disabled as an invalid external configuration", () => {
    expect(() =>
      Schema.decodeUnknownSync(LoginSettings)({
        localLogin: false,
        mediaServerLogin: false,
        mediaServerType: 1,
      }),
    ).toThrow();
  });
});
