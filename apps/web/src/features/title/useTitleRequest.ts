"use client";

import { useActionState } from "react";

import { requestTitle } from "./actions";

import type { RequestResult } from "./actions";
import type { RequestedAvailability } from "./title";

export function useTitleRequest(
  onRequested: ((availability: RequestedAvailability) => void) | undefined,
) {
  return useActionState<RequestResult | undefined, FormData>(async (previous, formData) => {
    try {
      const result = await requestTitle(previous, formData);

      if (result.ok) {
        onRequested?.(result.availability);
      }

      return result;
    } catch {
      return {
        ok: false,
        message: "The request couldn’t reach Disco. Check your connection and try again.",
      };
    }
  }, undefined);
}
