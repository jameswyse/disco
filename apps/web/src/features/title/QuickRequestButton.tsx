"use client";

import { useTitleRequest } from "./useTitleRequest";

import type { MediaType } from "@/integrations/seerr/client";

import type { RequestedAvailability } from "./title";

import styles from "./QuickRequestButton.module.css";

type QuickRequestButtonProperties = Readonly<{
  mediaType: MediaType;
  id: number;
  title: string;
  requested: boolean;
  className: string | undefined;
  onRequested: (availability: RequestedAvailability) => void;
}>;

export function QuickRequestButton({
  mediaType,
  id,
  title,
  requested,
  className,
  onRequested,
}: QuickRequestButtonProperties) {
  const [result, submit, pending] = useTitleRequest(onRequested);

  const failure = result && !result.ok ? result.message : undefined;

  let label = `Request ${title}`;
  let symbol = "↓";

  if (requested) {
    label = `${title} requested`;
    symbol = "✓";
  } else if (pending) {
    label = `Requesting ${title}`;
    symbol = "…";
  } else if (failure) {
    label = `Request ${title} again. ${failure}`;
    symbol = "!";
  }

  return (
    <form action={submit} className={styles.form}>
      <input name="mediaType" type="hidden" value={mediaType} />
      <input name="id" type="hidden" value={id} />
      <button
        aria-disabled={requested || pending}
        aria-label={label}
        className={className}
        data-state={requested ? "requested" : failure ? "failed" : undefined}
        onClick={(event) => {
          if (requested || pending) {
            event.preventDefault();
          }
        }}
        title={failure ?? label}
        type="submit"
      >
        {symbol}
      </button>
      <span aria-live="polite" className={styles.announcement}>
        {failure ?? (requested ? `${title} requested` : "")}
      </span>
    </form>
  );
}
