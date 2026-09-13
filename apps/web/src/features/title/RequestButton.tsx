"use client";

import { useActionState } from "react";

import { requestTitle } from "./actions";

import type { MediaType } from "@/integrations/seerr/client";

import type { ActionResult } from "./actions";

type RequestButtonProperties = Readonly<{
  mediaType: MediaType;
  id: number;
  /** Request one season instead of the whole series. */
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

  if (result?.ok) {
    return (
      <span aria-live="polite" className={pendingClassName ?? className}>
        ✓ Requested
      </span>
    );
  }

  return (
    <form action={submit} style={{ display: "contents" }}>
      <input name="mediaType" type="hidden" value={mediaType} />
      <input name="id" type="hidden" value={id} />
      {season === undefined ? null : <input name="season" type="hidden" value={season} />}
      <button className={className} disabled={pending} type="submit">
        {pending ? "Requesting…" : label}
      </button>
      {result ? (
        <span role="alert" style={{ color: "var(--color-warning)", fontSize: 12 }}>
          {result.message}
        </span>
      ) : null}
    </form>
  );
}
