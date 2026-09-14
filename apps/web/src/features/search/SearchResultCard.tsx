import Image from "next/image";
import Link from "next/link";

import { TitleCard } from "@/features/title/TitleCard";
import { tmdbImageUrl } from "@/integrations/seerr/images";

import { searchItemHref } from "./searchResult";

import type { PreviewMode } from "@/features/settings/settings";

import type { SearchItem } from "./searchResult";

import styles from "./SearchResultCard.module.css";

export function SearchResultCard({
  item,
  previewMode,
}: Readonly<{ item: SearchItem; previewMode: PreviewMode }>) {
  if (item.mediaType !== "person") {
    return <TitleCard previewMode={previewMode} title={item} />;
  }

  return (
    <li className={styles.person}>
      <Link href={searchItemHref(item)}>
        <div className={styles.portrait}>
          {item.posterPath ? (
            <Image
              alt=""
              fill
              sizes="200px"
              src={tmdbImageUrl("w342", item.posterPath)}
              unoptimized
            />
          ) : (
            <span aria-hidden="true">◯</span>
          )}
          <span className={styles.badge}>Person</span>
        </div>
        <h2>{item.name}</h2>
        <p>{item.knownFor || "View biography and credits"}</p>
      </Link>
    </li>
  );
}
