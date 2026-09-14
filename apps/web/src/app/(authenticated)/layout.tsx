import { Suspense } from "react";

import { Account } from "@/features/auth/Account";
import { RequestCount } from "@/features/requests/RequestCount";
import { loadViews } from "@/features/views/loadViews";
import { Sidebar } from "@/features/views/Sidebar";
import { ViewEditor } from "@/features/views/ViewEditor";
import { requireSession } from "@/platform/auth/session";

import { AppShell } from "./AppShell";

import type { ReactNode } from "react";

async function AuthenticatedShell({ children }: Readonly<{ children: ReactNode }>) {
  await requireSession();
  const views = await loadViews();

  return (
    <ViewEditor views={views}>
      <AppShell account={<Account />} requestCount={<RequestCount />} sidebar={<Sidebar />}>
        {children}
      </AppShell>
    </ViewEditor>
  );
}

export default function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<p role="status">Loading Disco…</p>}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
