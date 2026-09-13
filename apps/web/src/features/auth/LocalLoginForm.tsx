"use client";

import { useActionState } from "react";

import { localLogin } from "./actions";

import styles from "./Login.module.css";

export function LocalLoginForm() {
  const [result, action, pending] = useActionState(localLogin, undefined);

  return (
    <form action={action} className={styles.form}>
      <label htmlFor="email">Email address</label>
      <input autoComplete="username" id="email" name="email" required type="email" />
      <label htmlFor="password">Password</label>
      <input
        autoComplete="current-password"
        id="password"
        name="password"
        required
        type="password"
      />
      {result && (
        <p className={styles.error} role="alert">
          {result.message}
        </p>
      )}
      <button className={styles.button} disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
