import { Suspense } from "react";

import { Sidebar } from "@/features/views/Sidebar";
import { requireSession } from "@/platform/auth/session";

import type { ReactNode } from "react";

import styles from "../layout.module.css";

async function AuthenticatedShell({ children }: Readonly<{ children: ReactNode }>) {
  await requireSession();

  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}

export default function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<p role="status">Loading Disco…</p>}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
