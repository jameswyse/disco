"use client";

import Link from "next/link";

import { useCallback, useEffect, useRef } from "react";

import { AccountIcon } from "./AccountIcon";
import { LogoutButton } from "./LogoutButton";

import type { ReactNode } from "react";

import styles from "./AccountMenu.module.css";

export function AccountMenu({
  children,
  displayName,
}: Readonly<{ children: ReactNode; displayName: string }>) {
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

  const close = useCallback(() => {
    if (details.current) {
      details.current.open = false;
    }
  }, []);

  useEffect(() => {
    function dismiss(event: PointerEvent | FocusEvent) {
      if (event.target instanceof Node && !details.current?.contains(event.target)) {
        close();
      }
    }

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && details.current?.open) {
        close();
        trigger.current?.focus();
      }
    }

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [close]);

  return (
    <details className={styles.account} ref={details}>
      <summary
        aria-label={`User menu for ${displayName}`}
        className={styles.accountTrigger}
        ref={trigger}
      >
        {children}
        <span className={styles.userName} title={displayName}>
          {displayName}
        </span>
        <AccountIcon name="menu" />
      </summary>
      <nav aria-label="User account" className={styles.accountMenu}>
        <Link className={styles.accountItem} href="/settings" onNavigate={close}>
          <AccountIcon name="preferences" />
          Preferences
        </Link>
        <Link className={styles.accountItem} href="/views" onNavigate={close}>
          <AccountIcon name="views" />
          Manage views
        </Link>
        <div className={styles.logout}>
          <LogoutButton className={styles.accountItem} icon={<AccountIcon name="logout" />} />
        </div>
      </nav>
    </details>
  );
}
