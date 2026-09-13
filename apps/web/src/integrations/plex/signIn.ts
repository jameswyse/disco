import { Data, Effect, Schema } from "effect";

const Pin = Schema.Struct({
  id: Schema.Number.pipe(Schema.int(), Schema.positive()),
  code: Schema.NonEmptyString,
  expiresAt: Schema.DateFromString,
});

const PinStatus = Schema.Struct({
  authToken: Schema.NullOr(Schema.NonEmptyString),
});

class PlexSignInFailed extends Data.TaggedError("PlexSignInFailed")<{
  message: string;
}> {}

type SignInResult =
  | { readonly kind: "ok"; readonly authToken: string }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "cancelled" };

type SignInAttempt =
  | { readonly kind: "blocked"; readonly message: string }
  | {
      readonly kind: "started";
      readonly result: Promise<SignInResult>;
      readonly cancel: () => void;
    };

const connectionFailure = () =>
  new PlexSignInFailed({ message: "Unable to connect to Plex. Try signing in again." });

function requestPlex<A, I>({
  url,
  method,
  headers,
  schema,
}: {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  schema: Schema.Schema<A, I>;
}) {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(url, { method, headers, signal, credentials: "omit" }),
      catch: connectionFailure,
    });

    if (!response.ok) {
      return yield* new PlexSignInFailed({
        message: "Plex could not complete sign-in. Try signing in again.",
      });
    }

    const body: unknown = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: connectionFailure,
    });

    return yield* Schema.decodeUnknown(schema)(body).pipe(Effect.mapError(connectionFailure));
  });
}

/** Call from the button's click handler so the popup opens within the browser's user gesture. */
export function startPlexSignIn(): SignInAttempt {
  const popup = window.open("about:blank", "_blank", "popup,width=600,height=700");

  if (!popup) {
    return {
      kind: "blocked",
      message: "Allow popups for Disco, then try signing in with Plex again.",
    };
  }

  popup.opener = null;

  const controller = new AbortController();
  const program = Effect.gen(function* () {
    const clientIdentifier = yield* Effect.sync(() =>
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join(""),
    );
    const headers = {
      Accept: "application/json",
      "X-Plex-Product": "Disco",
      "X-Plex-Version": "1",
      "X-Plex-Client-Identifier": clientIdentifier,
    };
    const pin = yield* requestPlex({
      url: "https://plex.tv/api/v2/pins?strong=true",
      method: "POST",
      headers,
      schema: Pin,
    });

    if (popup.closed) {
      return yield* new PlexSignInFailed({
        message: "Plex sign-in was cancelled. You can try again.",
      });
    }

    const parameters = new URLSearchParams({
      clientID: clientIdentifier,
      code: pin.code,
      "context[device][product]": "Disco",
    });
    yield* Effect.sync(() => {
      popup.location.href = `https://app.plex.tv/auth/#!?${parameters.toString()}`;
    });

    // Plex's cross-origin popup can report closed while open. Cancellation is explicit.
    const poll: Effect.Effect<string, PlexSignInFailed> = Effect.suspend(() =>
      Effect.gen(function* () {
        const status = yield* requestPlex({
          url: `https://plex.tv/api/v2/pins/${pin.id}`,
          method: "GET",
          headers,
          schema: PinStatus,
        });

        if (status.authToken !== null) {
          return status.authToken;
        }

        yield* Effect.sleep("1 second");

        return yield* poll;
      }),
    );

    return yield* poll.pipe(
      Effect.timeoutFail({
        duration: Math.max(0, pin.expiresAt.getTime() - Date.now()),
        onTimeout: () =>
          new PlexSignInFailed({ message: "Plex sign-in expired. Try signing in again." }),
      }),
    );
  }).pipe(
    Effect.ensuring(Effect.sync(() => popup.close())),
    Effect.match({
      onFailure: (error): SignInResult => ({ kind: "error", message: error.message }),
      onSuccess: (authToken): SignInResult => ({ kind: "ok", authToken }),
    }),
  );

  const result = Effect.runPromise(program, { signal: controller.signal }).catch(
    (): SignInResult =>
      controller.signal.aborted
        ? { kind: "cancelled" }
        : { kind: "error", message: "Unable to complete Plex sign-in. Try again." },
  );

  return { kind: "started", result, cancel: () => controller.abort() };
}
