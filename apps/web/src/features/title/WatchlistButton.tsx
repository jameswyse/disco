"use client";

import { useActionState, useState } from "react";

import { toggleWatchlist } from "./actions";

import type { MediaType } from "@/integrations/seerr/client";

type WatchlistButtonProperties = Readonly<{
  mediaType: MediaType;
  id: number;
  title: string;
  onWatchlist: boolean;
  className: string | undefined;
  compact?: boolean;
  onChanged?: (listed: boolean) => void;
}>;

export function WatchlistButton({
  mediaType,
  id,
  title,
  onWatchlist,
  className,
  compact = false,
  onChanged,
}: WatchlistButtonProperties) {
  const [change, setChange] = useState<Readonly<{ from: boolean; listed: boolean }>>();

  if (change !== undefined && change.from !== onWatchlist) {
    setChange(undefined);
  }

  const listed = change?.from === onWatchlist ? change.listed : onWatchlist;

  const [error, submit, pending] = useActionState<string | undefined, FormData>(
    async (_previous, formData) => {
      const result = await toggleWatchlist(undefined, formData);

      if (!result.ok) {
        return result.message;
      }

      setChange({ from: onWatchlist, listed: !listed });
      onChanged?.(!listed);

      return undefined;
    },
    undefined,
  );

  const fullLabel = listed ? "✓ Watchlisted" : "＋ Watchlist";
  const compactLabel = listed ? "✓" : "＋";

  return (
    <form action={submit} style={{ display: "contents" }}>
      <input name="mediaType" type="hidden" value={mediaType} />
      <input name="id" type="hidden" value={id} />
      <input name="title" type="hidden" value={title} />
      <input name="action" type="hidden" value={listed ? "remove" : "add"} />
      <button
        aria-label={listed ? "Remove from watchlist" : "Add to watchlist"}
        aria-pressed={listed}
        className={className}
        disabled={pending}
        type="submit"
      >
        {compact ? compactLabel : fullLabel}
      </button>
      {error ? (
        <span role="alert" style={{ color: "var(--color-warning)", fontSize: 12 }}>
          {error}
        </span>
      ) : null}
    </form>
  );
}
