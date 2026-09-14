"use client";

import { useActionState } from "react";

import { logout } from "./actions";

import type { ReactNode } from "react";

import styles from "./Login.module.css";

export function LogoutButton({
  className,
  icon,
}: Readonly<{ className: string | undefined; icon: ReactNode }>) {
  const [result, action, pending] = useActionState(logout, undefined);

  return (
    <form action={action}>
      <button className={className} disabled={pending} type="submit">
        {icon}
        {pending ? "Logging out…" : "Logout"}
      </button>
      {result && (
        <p className={styles.error} role="alert">
          {result.message}
        </p>
      )}
    </form>
  );
}
