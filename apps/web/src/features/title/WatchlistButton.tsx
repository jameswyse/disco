"use client";

import { useActionState } from "react";

import { toggleWatchlist } from "./actions";

import type { MediaType } from "@/integrations/seerr/client";

import type { ActionResult } from "./actions";

type WatchlistButtonProperties = Readonly<{
  mediaType: MediaType;
  id: number;
  title: string;
  onWatchlist: boolean;
  className: string | undefined;
}>;

export function WatchlistButton({
  mediaType,
  id,
  title,
  onWatchlist,
  className,
}: WatchlistButtonProperties) {
  const [result, submit, pending] = useActionState<ActionResult | undefined, FormData>(
    toggleWatchlist,
    undefined,
  );
  // The server re-renders with the new state after a successful toggle; until then flip locally.
  const listed = result?.ok ? !onWatchlist : onWatchlist;

  return (
    <form action={submit} style={{ display: "contents" }}>
      <input name="mediaType" type="hidden" value={mediaType} />
      <input name="id" type="hidden" value={id} />
      <input name="title" type="hidden" value={title} />
      <input name="action" type="hidden" value={listed ? "remove" : "add"} />
      <button aria-pressed={listed} className={className} disabled={pending} type="submit">
        {listed ? "✓ Watchlisted" : "＋ Watchlist"}
      </button>
      {result && !result.ok ? (
        <span role="alert" style={{ color: "var(--color-warning)", fontSize: 12 }}>
          {result.message}
        </span>
      ) : null}
    </form>
  );
}
