import type { TitleDetails } from "./titleDetails";

export type TimelineStep = Readonly<{
  id: "requested" | "searching" | "downloading" | "available" | "declined";
  label: string;
  detail: string | undefined;
  state: "done" | "active" | "pending";
}>;

function formatWhen(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function stepState(done: boolean, active: boolean): TimelineStep["state"] {
  if (done) {
    return "done";
  }

  return active ? "active" : "pending";
}

/**
 * The request → Sonarr/Radarr → Plex journey as shown in the details side panel. Empty when the
 * title has never been requested and is not in the library.
 */
export function requestTimeline(details: TitleDetails): readonly TimelineStep[] {
  const [latest] = [...details.requests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const available =
    details.availability === "available" || details.availability === "partially-available";

  if (!latest && !available) {
    return [];
  }

  if (latest?.status === "declined") {
    return [
      {
        id: "requested",
        label: "Requested",
        detail: [latest.requestedBy, formatWhen(latest.requestedAt)].filter(Boolean).join(" · "),
        state: "done",
      },
      { id: "declined", label: "Declined", detail: undefined, state: "active" },
    ];
  }

  const downloading = details.downloads.length > 0;
  const searching = !available && !downloading && details.availability === "processing";
  const awaitingApproval = latest?.status === "pending";
  const requestedDetail = latest
    ? [
        latest.requestedBy,
        formatWhen(latest.requestedAt),
        latest.status === "approved" || latest.status === "completed" ? "approved" : undefined,
        awaitingApproval ? "awaiting approval" : undefined,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Added to Plex outside Seerr";
  const downloadDetail = downloading
    ? details.downloads
        .map((download) =>
          download.progress === undefined
            ? download.title
            : `${download.title} · ${Math.round(download.progress * 100)}%`,
        )
        .join(", ")
    : undefined;

  return [
    {
      id: "requested",
      label: "Requested",
      detail: requestedDetail,
      state: awaitingApproval ? "active" : "done",
    },
    {
      id: "searching",
      label: "Searching indexers",
      detail: details.mediaType === "movie" ? "Radarr" : "Sonarr",
      state: stepState(available || downloading, searching),
    },
    {
      id: "downloading",
      label: "Downloading",
      detail: downloadDetail,
      state: stepState(available, downloading),
    },
    {
      id: "available",
      label:
        details.availability === "partially-available" ? "Partly in Plex" : "Available in Plex",
      detail: available ? undefined : "You'll see it here once Plex has it",
      state: available ? "done" : "pending",
    },
  ];
}
