"use client";
import styles from "@/features/feedback/ContentState.module.css";

export default function ErrorPage({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <section className={styles.state} role="alert">
      <h2>This page couldn’t be loaded</h2>
      <p>Please try again. Your saved views and preferences are still here.</p>
      <button className={styles.button} onClick={reset} type="button">
        Try again
      </button>
    </section>
  );
}
