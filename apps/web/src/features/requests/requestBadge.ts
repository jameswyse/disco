import { availabilityLabels } from "@/features/title/title";

import type { RequestRow } from "./loadRequests";

const badges = {
  blocklisted: { label: "Blocklisted", tone: "negative" },
  pending: { label: "Pending approval", tone: "pending" },
  approved: { label: "Approved", tone: "processing" },
  declined: { label: "Declined", tone: "negative" },
  failed: { label: "Failed", tone: "negative" },
  completed: { label: "Completed", tone: "neutral" },
  available: { label: "Available", tone: "available" },
  "up-to-date": { label: "Up to date", tone: "available" },
  "some-available": { label: "Some episodes available", tone: "available" },
  "partially-available": { label: availabilityLabels["partially-available"], tone: "available" },
  processing: { label: "Processing", tone: "processing" },
} as const;

export function requestBadge({
  status,
  availability,
}: Pick<RequestRow, "status" | "availability">) {
  if (status === "declined" || status === "failed" || status === "pending") {
    return badges[status];
  }

  switch (availability) {
    case "blocklisted":
    case "up-to-date":
    case "some-available":
    case "available":
    case "partially-available":
    case "processing":
      return badges[availability];
    case "pending":
    case "not-yet-aired":
    case "not-in-library":
      return badges[status];

    default: {
      const unsupportedAvailability: never = availability;

      return unsupportedAvailability;
    }
  }
}
