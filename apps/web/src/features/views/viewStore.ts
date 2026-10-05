import path from "node:path";

import { Context, Effect, Layer, Schema, Semaphore } from "effect";

import { dataDirectoryConfig, readJsonFile, writeJsonFile } from "@/platform/jsonFile";

import { defaultViews, View } from "./views";

const ViewsFile = Schema.Struct({ version: Schema.Literal(1), views: Schema.Array(View) });
type ViewsFile = typeof ViewsFile.Type;
const fileName = "views.json";
const emptyFile: ViewsFile = { version: 1, views: defaultViews };

export class ViewStore extends Context.Service<ViewStore>()("ViewStore", {
  make: Effect.gen(function* () {
    const dataDirectory = path.resolve(yield* dataDirectoryConfig);
    const mutex = yield* Semaphore.make(1);

    const read = () =>
      readJsonFile(dataDirectory, fileName, ViewsFile, emptyFile).pipe(
        Effect.map((file) => file.views),
      );

    return {
      read,
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
}) {
  static readonly layer = Layer.effect(this, this.make);
}
