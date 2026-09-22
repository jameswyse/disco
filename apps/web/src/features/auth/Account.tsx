import Image from "next/image";

import { Suspense } from "react";

import { DiscoLoader } from "@/features/feedback/DiscoLoader";

import { AccountMenu } from "./AccountMenu";
import { loadAccount } from "./loadAccount";

import styles from "./AccountMenu.module.css";

async function AccountContent() {
  const account = await loadAccount();

  if (account.kind === "error") {
    return (
      <span className={styles.accountNote} role="alert">
        {account.message}
      </span>
    );
  }

  const { user } = account;

  return (
    <AccountMenu displayName={user.displayName}>
      {user.avatarUrl ? (
        <Image
          alt=""
          className={styles.avatar}
          height={28}
          src={user.avatarUrl}
          unoptimized
          width={28}
        />
      ) : (
        <span aria-hidden="true" className={styles.avatar} />
      )}
    </AccountMenu>
  );
}

export function Account() {
  return (
    <Suspense fallback={<DiscoLoader label="Loading account" size="inline" />}>
      <AccountContent />
    </Suspense>
  );
}
