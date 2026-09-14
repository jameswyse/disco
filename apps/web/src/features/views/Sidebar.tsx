import { loadSettings } from "@/features/settings/loadSettings";
import { defaultSidebarStyle } from "@/features/settings/settings";

import { SidebarViews } from "./SidebarViews";

import styles from "./Sidebar.module.css";

export async function Sidebar() {
  const settings = await loadSettings();
  const sidebarStyle = settings.sidebarStyle ?? defaultSidebarStyle;

  return (
    <aside aria-label="Views" className={`${styles.sidebar} ${styles[sidebarStyle]}`}>
      <SidebarViews sidebarStyle={sidebarStyle} />
    </aside>
  );
}
