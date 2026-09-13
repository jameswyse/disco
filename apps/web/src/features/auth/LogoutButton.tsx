"use client";

import { useActionState } from "react";

import { logout } from "./actions";

import styles from "./Login.module.css";

export function LogoutButton() {
  const [result, action, pending] = useActionState(logout, undefined);

  return (
    <form action={action}>
      <button className={styles.signOut} disabled={pending} type="submit">
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {result && (
        <p className={styles.error} role="alert">
          {result.message}
        </p>
      )}
    </form>
  );
}
