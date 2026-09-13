"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { startPlexSignIn } from "@/integrations/plex/signIn";

import { plexLogin } from "./actions";

import styles from "./Login.module.css";

type LoginState =
  | { readonly kind: "idle" }
  | { readonly kind: "waiting" }
  | { readonly kind: "error"; readonly message: string };

export function PlexLoginButton() {
  const [result, submit, pending] = useActionState(plexLogin, undefined);
  const [state, setState] = useState<LoginState>({ kind: "idle" });
  const attempt = useRef<{ readonly cancel: () => void }>(null);

  useEffect(
    () => () => {
      attempt.current?.cancel();
      attempt.current = null;
    },
    [],
  );

  function signIn() {
    const current = startPlexSignIn();

    if (current.kind === "blocked") {
      setState({ kind: "error", message: current.message });

      return;
    }

    attempt.current = current;
    setState({ kind: "waiting" });

    void current.result.then((outcome) => {
      if (attempt.current !== current) {
        return undefined;
      }

      attempt.current = null;

      if (outcome.kind === "ok") {
        const formData = new FormData();
        formData.set("authToken", outcome.authToken);
        setState({ kind: "idle" });
        startTransition(() => submit(formData));
      } else {
        setState({
          kind: "error",
          message:
            outcome.kind === "error"
              ? outcome.message
              : "Plex sign-in was cancelled. You can try again.",
        });
      }

      return undefined;
    });
  }

  function cancel() {
    attempt.current?.cancel();
  }

  const busy = state.kind === "waiting" || pending;
  const message = state.kind === "error" ? state.message : result?.message;

  return (
    <div>
      <button className={styles.button} disabled={busy} onClick={signIn} type="button">
        {pending ? "Signing in…" : "Sign in with Plex"}
      </button>
      <p className={styles.note} role="status">
        {state.kind === "waiting" ? "Complete sign-in in the Plex window." : ""}
      </p>
      {state.kind === "waiting" ? (
        <button className={styles.button} onClick={cancel} type="button">
          Cancel Plex sign-in
        </button>
      ) : null}
      <p className={styles.error} role="alert">
        {!busy && message}
      </p>
    </div>
  );
}
