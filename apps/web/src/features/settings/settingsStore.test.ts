import { mkdtemp, readdir, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigProvider, Effect, Exit, Layer, ManagedRuntime } from "effect";
import { expect, it, onTestFinished } from "vitest";

import { SettingsStore } from "./settingsStore";

async function testStore() {
  const directory = await mkdtemp(path.join(tmpdir(), "disco-settings-test-"));
  const runtime = ManagedRuntime.make(
    SettingsStore.Default.pipe(
      Layer.provide(
        Layer.setConfigProvider(ConfigProvider.fromMap(new Map([["DISCO_DATA_DIR", directory]]))),
      ),
    ),
  );
  onTestFinished(async () => {
    await runtime.dispose();

    for (const file of await readdir(directory)) {
      await unlink(path.join(directory, file));
    }

    await rmdir(directory);
  });

  return runtime;
}

it("preserves both preferences when updates overlap", async () => {
  const runtime = await testStore();
  const result = await runtime.runPromise(
    Effect.gen(function* () {
      const store = yield* SettingsStore;
      const updates = yield* Effect.all(
        [
          store.update((settings) => ({ ...settings, defaultLanguage: "fr" })).pipe(Effect.either),
          store.update((settings) => ({ ...settings, previewMode: "button" })).pipe(Effect.either),
        ],
        { concurrency: "unbounded" },
      );

      return { updates: updates.map((outcome) => outcome._tag), settings: yield* store.read() };
    }),
  );
  expect(result).toEqual({
    updates: ["Right", "Right"],
    settings: { defaultLanguage: "fr", previewMode: "button" },
  });
});

it("allows another save after an update fails", async () => {
  const runtime = await testStore();
  const result = await runtime.runPromise(
    Effect.gen(function* () {
      const store = yield* SettingsStore;
      const failed = yield* store
        .update(() => {
          throw new Error("Rejected update");
        })
        .pipe(Effect.exit);
      yield* store.update((settings) => ({ ...settings, defaultLanguage: "fr" }));

      return { failed: Exit.isFailure(failed), settings: yield* store.read() };
    }),
  );
  expect(result).toEqual({ failed: true, settings: { defaultLanguage: "fr" } });
});
