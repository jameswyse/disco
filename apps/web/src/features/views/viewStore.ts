import path from "node:path";

import { Effect, Schema } from "effect";

import { dataDirectoryConfig, readJsonFile, writeJsonFile } from "@/platform/jsonFile";

import { defaultViews, View } from "./views";

const ViewsFile = Schema.Struct({ version: Schema.Literal(1), views: Schema.Array(View) });
type ViewsFile = typeof ViewsFile.Type;
const fileName = "views.json";
const emptyFile: ViewsFile = { version: 1, views: defaultViews };

export class ViewStore extends Effect.Service<ViewStore>()("ViewStore", {
  effect: Effect.gen(function* () {
    const dataDirectory = path.resolve(yield* dataDirectoryConfig);
    const mutex = yield* Effect.makeSemaphore(1);
    const read = () =>
      readJsonFile(dataDirectory, fileName, ViewsFile, emptyFile).pipe(
        Effect.map((file) => file.views),
      );

    return {
      read,
      /** Replace the saved views with the result of `update`, which sees the current list. */
      update: (update: (views: readonly View[]) => readonly View[]) =>
        read().pipe(
          Effect.flatMap((views) => {
            const file: ViewsFile = { version: 1, views: update(views) };

            return writeJsonFile(dataDirectory, fileName, ViewsFile, file);
          }),
          mutex.withPermits(1),
        ),
    };
  }),
}) {}
