"use client";

import { useRouter } from "next/navigation";

import { useTransition } from "react";

import styles from "./ContentState.module.css";

export function ContentState({
  title,
  message,
  retry,
}: Readonly<{ title: string; message?: string; retry?: boolean }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className={styles.state} role={retry ? "alert" : "status"}>
      <span aria-hidden="true" className={styles.symbol}>
        {retry ? "!" : "◇"}
      </span>
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
      {retry ? (
        <button
          aria-busy={pending}
          className={styles.button}
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
          type="button"
        >
          {pending ? "Trying again…" : "Try again"}
        </button>
      ) : null}
    </section>
  );
}
