import styles from "./AccountMenu.module.css";

const paths = {
  menu: "m6 10 6 6 6-6",
  preferences: "M4 7h4m4 0h8M4 17h8m4 0h4 M8 4v6 M16 14v6",
  views: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  logout: "M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4 M9 12h12 m-4-4 4 4-4 4",
} as const;

export function AccountIcon({ name }: Readonly<{ name: keyof typeof paths }>) {
  return (
    <svg
      aria-hidden="true"
      className={name === "menu" ? styles.menuIcon : styles.accountIcon}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d={paths[name]} />
    </svg>
  );
}
