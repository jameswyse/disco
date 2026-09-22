import Image from "next/image";

import styles from "./DiscoLoader.module.css";

type DiscoLoaderProperties = Readonly<{
  label?: string;
  size?: "screen" | "content" | "inline";
}>;

/** Native image playback works before Suspense hydrates. */
export function DiscoLoader({ label = "Loading Disco", size = "content" }: DiscoLoaderProperties) {
  return (
    <span aria-label={label} className={`${styles.loader} ${styles[size]}`} role="status">
      <picture className={styles.artwork}>
        <source
          media="(prefers-reduced-motion: no-preference)"
          srcSet="/brand/disco-logo-animated.webp"
        />
        <Image
          alt=""
          className={styles.ball}
          height={768}
          loading="eager"
          src="/brand/disco-logo.webp"
          unoptimized
          width={768}
        />
      </picture>
      <span className={styles.visuallyHidden}>{label}</span>
    </span>
  );
}
