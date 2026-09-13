import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className={styles.loading}>
      Loading…
    </div>
  );
}
