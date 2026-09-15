"use client";

import { useActionState, useId, useRef } from "react";

import { toggleBlocklist } from "./actions";

import type { MediaType } from "@/integrations/seerr/client";

import type { ActionResult } from "./actions";

import styles from "./BlocklistButton.module.css";

type BlocklistButtonProperties = Readonly<{
  mediaType: MediaType;
  id: number;
  title: string;
  blocklisted: boolean;
  className: string | undefined;
  compact?: boolean;
  onChanged?: () => void;
}>;

export function BlocklistButton({
  mediaType,
  id,
  title,
  blocklisted,
  className,
  compact = false,
  onChanged,
}: BlocklistButtonProperties) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const [result, submit, pending] = useActionState<ActionResult | undefined, FormData>(
    async (previous, formData) => {
      const next = await toggleBlocklist(previous, formData);

      if (next.ok) {
        dialog.current?.close();
        onChanged?.();
      }

      return next;
    },
    undefined,
  );
  const label = blocklisted ? "Remove from blocklist" : "Blocklist";

  return (
    <>
      <button
        aria-label={label}
        className={className}
        onClick={() => dialog.current?.showModal()}
        title={label}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="m6 6 12 12" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {compact ? null : label}
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={headingId}
        className={styles.dialog}
        ref={dialog}
      >
        <form action={submit}>
          <h2 id={headingId}>{blocklisted ? `Unblock ${title}?` : `Blocklist ${title}?`}</h2>
          <p id={descriptionId}>
            {blocklisted
              ? "This title will appear in browsing and can be requested again."
              : "This hides the title from browsing and prevents requests for everyone in Seerr."}
          </p>
          <input name="mediaType" type="hidden" value={mediaType} />
          <input name="id" type="hidden" value={id} />
          <input name="title" type="hidden" value={title} />
          <input name="action" type="hidden" value={blocklisted ? "remove" : "add"} />
          {result && !result.ok ? (
            <p className={styles.error} role="alert">
              {result.message}
            </p>
          ) : null}
          <footer>
            <button className={styles.cancel} onClick={() => dialog.current?.close()} type="button">
              Cancel
            </button>
            <button className={styles.confirm} disabled={pending} type="submit">
              {pending ? "Saving…" : label}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
