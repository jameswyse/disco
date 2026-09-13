import { Suspense } from "react";

import { loadSidebar } from "@/features/views/loadSidebar";
import { Sidebar } from "@/features/views/Sidebar";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import styles from "./layout.module.css";
import "./globals.css";

export const metadata: Metadata = {
  description: "Browse, filter and request movies and TV shows through Seerr.",
  title: {
    default: "Disco",
    template: "%s · Disco",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

async function LoadedSidebar() {
  return <Sidebar data={await loadSidebar()} />;
}

type RootLayoutProperties = Readonly<{ children: ReactNode }>;

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html lang="en">
      <body>
        <div className={styles.app}>
          <Suspense fallback={<Sidebar data={undefined} />}>
            <LoadedSidebar />
          </Suspense>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
