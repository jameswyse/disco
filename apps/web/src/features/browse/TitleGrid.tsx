import { TitleCard } from "@/features/title/TitleCard";

import type { PreviewMode } from "@/features/settings/settings";
import type { Title } from "@/features/title/title";

import styles from "./BrowsePage.module.css";

type TitleGridProperties = Readonly<{
  label: string;
  titles: readonly Title[];
  previewMode: PreviewMode;
}>;

export function TitleGrid({ label, titles, previewMode }: TitleGridProperties) {
  if (titles.length === 0) {
    return <p className={styles.empty}>No titles match this view and these filters.</p>;
  }

  return (
    <ul aria-label={label} className={styles.grid}>
      {titles.map((title) => (
        <TitleCard key={`${title.mediaType}-${title.id}`} previewMode={previewMode} title={title} />
      ))}
    </ul>
  );
}
