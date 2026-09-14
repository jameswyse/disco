"use client";

import { useActionState, useId, useRef, useState } from "react";

import { requestTitle } from "./actions";
import { loadQualityProfiles } from "./loadQualityProfiles";

import type { MediaType } from "@/integrations/seerr/client";

import type { ActionResult } from "./actions";

import styles from "./RequestButton.module.css";

type RequestButtonProperties = Readonly<{
  mediaType: MediaType;
  id: number;
  season?: number;
  label: string;
  className: string | undefined;
  pendingClassName?: string | undefined;
}>;

export function RequestButton({
  mediaType,
  id,
  season,
  label,
  className,
  pendingClassName,
}: RequestButtonProperties) {
  const [result, submit, pending] = useActionState<ActionResult | undefined, FormData>(
    requestTitle,
    undefined,
  );
  const [options, setOptions] = useState<Awaited<ReturnType<typeof loadQualityProfiles>>>();
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  function load() {
    setOptions(undefined);
    void loadQualityProfiles(mediaType)
      .then(setOptions)
      .catch(() => setOptions({ kind: "error", message: "Quality profiles couldn’t be loaded." }));
  }

  if (result?.ok) {
    return (
      <span aria-live="polite" className={pendingClassName ?? className}>
        ✓ Requested
      </span>
    );
  }

  return (
    <>
      <button
        className={className}
        onClick={() => {
          dialog.current?.showModal();
          load();
        }}
        type="button"
      >
        {label}
      </button>
      <dialog aria-labelledby={headingId} className={styles.dialog} ref={dialog}>
        <form action={submit}>
          <header>
            <h2 id={headingId}>
              {season === undefined ? "Request title" : `Request season ${season}`}
            </h2>
            <button
              aria-label="Close request"
              className={styles.close}
              onClick={() => dialog.current?.close()}
              type="button"
            >
              ×
            </button>
          </header>
          <input name="mediaType" type="hidden" value={mediaType} />
          <input name="id" type="hidden" value={id} />
          {season === undefined ? null : <input name="season" type="hidden" value={season} />}
          {!options ? <p role="status">Loading quality profiles…</p> : null}
          {options?.kind === "error" ? (
            <div role="alert">
              <p>{options.message}</p>
              <button className={styles.secondary} onClick={load} type="button">
                Try again
              </button>
              <p>You can still request with the default profile.</p>
            </div>
          ) : null}
          {options?.kind === "ok" ? (
            options.canChoose && options.profiles.length > 0 ? (
              <label className={styles.field}>
                Quality profile
                <select aria-label="Quality profile" defaultValue="" name="quality">
                  <option value="">Server default</option>
                  {options.profiles.map((profile) => (
                    <option key={profile.key} value={profile.key}>
                      {profile.name} · {profile.serverName}
                      {profile.is4k ? " · 4K" : ""}
                      {profile.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p>Your request will use the quality profile set in Seerr.</p>
            )
          ) : null}
          <p className={styles.note}>
            Seerr will process your request and apply any approval rules.
          </p>
          {result ? (
            <p className={styles.error} role="alert">
              {result.message}
            </p>
          ) : null}
          <footer>
            <button
              className={styles.secondary}
              disabled={pending}
              onClick={() => dialog.current?.close()}
              type="button"
            >
              Cancel
            </button>
            <button className={styles.primary} disabled={pending || !options} type="submit">
              {pending ? "Requesting…" : "Confirm request"}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
