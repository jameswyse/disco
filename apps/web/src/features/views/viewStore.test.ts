import { mkdtemp, readdir, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigProvider, Effect, Layer, ManagedRuntime } from "effect";
import { expect, it, onTestFinished } from "vitest";

import { ViewStore } from "./viewStore";

it("preserves both views when updates overlap", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "disco-views-test-"));
  const runtime = ManagedRuntime.make(
    ViewStore.Default.pipe(
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
  const result = await runtime.runPromise(
    Effect.gen(function* () {
      const store = yield* ViewStore;
      yield* store.update(() => []);
      const updates = yield* Effect.all(
        [
          store
            .update((views) => [
              ...views,
              { id: "films", label: "Films", source: { kind: "media", mediaType: "movie" } },
            ])
            .pipe(Effect.either),
          store
            .update((views) => [
              ...views,
              { id: "series", label: "Series", source: { kind: "media", mediaType: "tv" } },
            ])
            .pipe(Effect.either),
        ],
        { concurrency: "unbounded" },
      );

      return {
        updates: updates.map((outcome) => outcome._tag),
        ids: (yield* store.read()).map((view) => view.id).sort(),
      };
    }),
  );
  expect(result).toEqual({ updates: ["Right", "Right"], ids: ["films", "series"] });
});
