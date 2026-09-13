import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Config, Data, Effect, Schema } from "effect";

import { defaultViews, View } from "./views";

/** The saved views file could not be read or written. */
export class ViewStoreError extends Data.TaggedError("ViewStoreError")<{
  readonly operation: "read" | "write";
  readonly cause: unknown;
}> {}

const ViewsFile = Schema.Struct({ version: Schema.Literal(1), views: Schema.Array(View) });
const decodeViewsFile = Schema.decodeUnknownSync(Schema.parseJson(ViewsFile));

/** Directory holding Disco's own data (saved views). Mount it as a volume in Docker. */
const dataDirectoryConfig = Config.string("DISCO_DATA_DIR").pipe(Config.withDefault("data"));

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export class ViewStore extends Effect.Service<ViewStore>()("ViewStore", {
  effect: Effect.gen(function* () {
    const dataDirectory = path.resolve(yield* dataDirectoryConfig);
    const viewsPath = path.join(dataDirectory, "views.json");

    const read = (): Effect.Effect<readonly View[], ViewStoreError> =>
      Effect.tryPromise({
        try: async () => {
          try {
            return decodeViewsFile(await readFile(viewsPath, "utf8")).views;
          } catch (error) {
            if (isMissingFile(error)) {
              return defaultViews;
            }

            throw error;
          }
        },
        catch: (cause) => new ViewStoreError({ operation: "read", cause }),
      });

    const write = (views: readonly View[]): Effect.Effect<void, ViewStoreError> =>
      Effect.tryPromise({
        try: async () => {
          await mkdir(dataDirectory, { recursive: true });
          const temporaryPath = `${viewsPath}.${process.pid}.tmp`;
          await writeFile(
            temporaryPath,
            `${JSON.stringify({ version: 1, views }, null, 2)}\n`,
            "utf8",
          );
          await rename(temporaryPath, viewsPath);
        },
        catch: (cause) => new ViewStoreError({ operation: "write", cause }),
      });

    return {
      read,
      /** Replace the saved views with the result of `update`, which sees the current list. */
      update: (update: (views: readonly View[]) => readonly View[]) =>
        read().pipe(Effect.flatMap((views) => write(update(views)))),
    };
  }),
}) {}
