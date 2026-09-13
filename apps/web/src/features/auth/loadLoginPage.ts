import { redirect } from "next/navigation";

import { Effect } from "effect";

import { SeerrClient } from "@/integrations/seerr/client";
import { readSession } from "@/platform/auth/session";
import { appRuntime } from "@/platform/runtime";

import type { PublicSettings } from "@/integrations/seerr/schemas";

type LoginPageResult =
  | Readonly<{ kind: "ok"; settings: PublicSettings }>
  | Readonly<{ kind: "error"; message: string }>;

export async function loadLoginPage(): Promise<LoginPageResult> {
  if (await readSession()) {
    redirect("/");
  }

  return appRuntime.runPromise(
    Effect.flatMap(SeerrClient, (client) => client.publicSettings()).pipe(
      Effect.map((settings): LoginPageResult => ({ kind: "ok", settings })),
      Effect.catchAll((error) =>
        Effect.succeed<LoginPageResult>({
          kind: "error",
          message:
            error._tag === "SeerrMalformed"
              ? "Seerr's sign-in configuration is invalid. Ask the administrator to check it."
              : "Seerr could not be reached. Try again shortly.",
        }),
      ),
    ),
  );
}
