import { Either } from "effect";

import { readSeerrEnvironment } from "@/platform/configuration/seerrEnvironment";

const responseHeaders = { "Cache-Control": "private, no-store" };

export function GET() {
  const environment = readSeerrEnvironment(process.env);

  if (Either.isLeft(environment)) {
    return Response.json({ status: "misconfigured" }, { headers: responseHeaders, status: 503 });
  }

  return Response.json({ status: "ok" }, { headers: responseHeaders, status: 200 });
}
