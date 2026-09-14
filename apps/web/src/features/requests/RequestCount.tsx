import { Suspense } from "react";

import { loadAccount } from "@/features/auth/loadAccount";

import styles from "./RequestCount.module.css";

async function Count() {
  const account = await loadAccount();

  if (account.kind === "error") {
    return null;
  }

  const count = account.requests.pending + account.requests.processing;

  return (
    <span className={styles.badge} title={`${count} open requests`}>
      {count}
    </span>
  );
}

export function RequestCount() {
  return (
    <Suspense fallback={null}>
      <Count />
    </Suspense>
  );
}
