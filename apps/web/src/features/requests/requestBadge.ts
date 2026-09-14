import type { RequestRow } from "./loadRequests";

const badges = {
  pending: { label: "Pending approval", tone: "pending" },
  approved: { label: "Approved", tone: "processing" },
  declined: { label: "Declined", tone: "negative" },
  failed: { label: "Failed", tone: "negative" },
  completed: { label: "Completed", tone: "neutral" },
  available: { label: "Available", tone: "available" },
  "partially-available": { label: "Partially available", tone: "available" },
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
    case "available":
    case "partially-available":
    case "processing":
      return badges[availability];
    case "pending":
    case "not-in-library":
      return badges[status];

    default: {
      const unsupportedAvailability: never = availability;

      return unsupportedAvailability;
    }
  }
}
