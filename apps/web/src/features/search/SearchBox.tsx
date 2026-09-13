"use client";

import { useRouter } from "next/navigation";

import { useEffect, useRef } from "react";

import styles from "./SearchBox.module.css";

type SearchBoxProperties = Readonly<{ initialQuery?: string }>;

export function SearchBox({ initialQuery = "" }: SearchBoxProperties) {
  const router = useRouter();
  const inputReference = useRef<HTMLInputElement>(null);

  // "/" focuses the search box from anywhere on the page, as the shortcut hint promises.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputReference.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <form
      className={styles.search}
      onSubmit={(event) => {
        event.preventDefault();
        const query = inputReference.current?.value.trim() ?? "";

        if (query !== "") {
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }
      }}
      role="search"
    >
      <input
        aria-label="Search"
        className={styles.input}
        defaultValue={initialQuery}
        name="q"
        placeholder="Search movies, shows, people…"
        ref={inputReference}
        type="search"
      />
      <kbd className={styles.shortcut}>/</kbd>
    </form>
  );
}
