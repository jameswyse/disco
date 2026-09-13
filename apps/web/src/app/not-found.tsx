import Link from "next/link";

import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <section className={styles.notFound}>
      <h1 className={styles.heading}>Nothing here</h1>
      <p className={styles.body}>That page does not exist.</p>
      <Link className={styles.link} href="/">
        Back to browse
      </Link>
    </section>
  );
}
