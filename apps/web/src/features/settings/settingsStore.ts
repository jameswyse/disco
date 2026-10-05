import path from "node:path";

import { Context, Effect, Layer, Schema, Semaphore } from "effect";

import { dataDirectoryConfig, readJsonFile, writeJsonFile } from "@/platform/jsonFile";

import { defaultSettings, Settings } from "./settings";

const SettingsFile = Schema.Struct({ version: Schema.Literal(1), settings: Settings });
type SettingsFile = typeof SettingsFile.Type;
const fileName = "settings.json";
const emptyFile: SettingsFile = { version: 1, settings: defaultSettings };

export class SettingsStore extends Context.Service<SettingsStore>()("SettingsStore", {
  make: Effect.gen(function* () {
    const dataDirectory = path.resolve(yield* dataDirectoryConfig);
    const mutex = yield* Semaphore.make(1);
    const read = () =>
      readJsonFile(dataDirectory, fileName, SettingsFile, emptyFile).pipe(
        Effect.map((file) => file.settings),
      );

    return {
      read,
      update: (update: (settings: Settings) => Settings) =>
        read().pipe(
          Effect.flatMap((settings) => {
            const file: SettingsFile = { version: 1, settings: update(settings) };

            return writeJsonFile(dataDirectory, fileName, SettingsFile, file);
          }),
          mutex.withPermits(1),
        ),
    };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make);
}
