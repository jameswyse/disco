import { Data } from "effect";

/** Seerr could not be reached (DNS, connection, timeout). */
export class SeerrUnavailable extends Data.TaggedError("SeerrUnavailable")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

/** Seerr answered with a non-2xx status. */
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
