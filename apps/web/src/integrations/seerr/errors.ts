import { Data } from "effect";

import type { HttpClientError } from "effect/http";

/** Seerr could not be reached (DNS, connection, timeout). */
export class SeerrUnavailable extends Data.TaggedError("SeerrUnavailable")<{
  readonly path: string;
  readonly cause: string;
}> {}

export class SeerrRejected extends Data.TaggedError("SeerrRejected")<{
  readonly path: string;
  readonly status: number;
}> {}

/** Seerr answered 2xx but the body did not match the expected schema. */
export class SeerrMalformed extends Data.TaggedError("SeerrMalformed")<{
  readonly path: string;
  readonly description: string;
}> {}

export type SeerrError = SeerrUnavailable | SeerrRejected | SeerrMalformed;

export function translateHttpError(
  path: string,
  error: HttpClientError.HttpClientError,
): SeerrError {
  const reason = error.reason;

  switch (reason._tag) {
    case "StatusCodeError":
    case "DecodeError":
    case "EmptyBodyError":
      return new SeerrRejected({ path, status: reason.response.status });
    case "TransportError":
    case "EncodeError":
    case "InvalidUrlError":
      return new SeerrUnavailable({ path, cause: reason._tag });

    default: {
      const unsupportedReason: never = reason;

      return unsupportedReason;
    }
  }
}

export function describeSeerrError(error: SeerrError): string {
  switch (error._tag) {
    case "SeerrUnavailable":
      return `Seerr could not be reached (${error.path}).`;
    case "SeerrRejected":
      return error.status === 401 || error.status === 403
        ? "Seerr did not allow this action for your account."
        : `Seerr responded with status ${error.status} (${error.path}).`;
    case "SeerrMalformed":
      return `Seerr returned an unexpected response (${error.path}).`;

    default: {
      const unsupportedError: never = error;

      return unsupportedError;
    }
  }
}
