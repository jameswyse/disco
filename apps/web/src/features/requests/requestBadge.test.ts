import { describe, expect, it } from "vitest";

import { requestBadge } from "./requestBadge";

import type { RequestRow } from "./loadRequests";

const cases = [
  { status: "pending", availability: "pending", label: "Pending approval" },
  { status: "pending", availability: "partially-available", label: "Pending approval" },
  { status: "approved", availability: "not-in-library", label: "Approved" },
  { status: "approved", availability: "pending", label: "Approved" },
  { status: "approved", availability: "processing", label: "Processing" },
  { status: "approved", availability: "partially-available", label: "Partially available" },
  { status: "approved", availability: "available", label: "Available" },
  { status: "completed", availability: "available", label: "Available" },
  { status: "completed", availability: "not-in-library", label: "Completed" },
] satisfies ReadonlyArray<Pick<RequestRow, "status" | "availability"> & { label: string }>;

describe("requestBadge", () => {
  it.each(cases)(
    "shows $label for $status requests with $availability media",
    ({ status, availability, label }) => {
      expect(requestBadge({ status, availability }).label).toBe(label);
    },
  );

  it.each(["not-in-library", "processing", "available"] as const)(
    "keeps declined and failed outcomes when media is %s",
    (availability) => {
      expect(requestBadge({ status: "declined", availability })).toEqual({
        label: "Declined",
        tone: "negative",
      });
      expect(requestBadge({ status: "failed", availability })).toEqual({
        label: "Failed",
        tone: "negative",
      });
    },
  );
});
