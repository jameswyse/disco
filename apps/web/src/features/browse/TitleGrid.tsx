import { TitleCard } from "./TitleCard";

import type { Title } from "./title";

import styles from "./BrowsePage.module.css";

type TitleGridProperties = Readonly<{ label: string; titles: readonly Title[] }>;

export function TitleGrid({ label, titles }: TitleGridProperties) {
  if (titles.length === 0) {
    return <p className={styles.empty}>No titles match this view and these filters.</p>;
  }

  return (
    <ul aria-label={label} className={styles.grid}>
      {titles.map((title) => (
        <TitleCard key={`${title.mediaType}-${title.id}`} title={title} />
      ))}
    </ul>
  );
}
