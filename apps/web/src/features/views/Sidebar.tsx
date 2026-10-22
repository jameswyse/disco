import { loadSettings } from "@/features/settings/loadSettings";
import { defaultLogoStyle, defaultSidebarStyle } from "@/features/settings/settings";

import { SidebarViews } from "./SidebarViews";

import styles from "./Sidebar.module.css";

export async function Sidebar() {
  const settings = await loadSettings();
  const sidebarStyle = settings.sidebarStyle ?? defaultSidebarStyle;
  const logoStyle = settings.logoStyle ?? defaultLogoStyle;

  return (
    <aside aria-label="Views" className={`${styles.sidebar} ${styles[sidebarStyle]}`}>
      <SidebarViews logoStyle={logoStyle} sidebarStyle={sidebarStyle} />
    </aside>
  );
}
