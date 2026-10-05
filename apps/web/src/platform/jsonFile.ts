import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Config, Data, Effect, Schema } from "effect";

export class DataFileError extends Data.TaggedError("DataFileError")<{
  readonly file: string;
  readonly operation: "read" | "write";
  readonly cause: unknown;
}> {}

export const dataDirectoryConfig = Config.String("DISCO_DATA_DIR").pipe(Config.withDefault("data"));

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function readJsonFile<A, I>(
  directory: string,
  file: string,
  schema: Schema.Codec<A, I>,
  fallback: A,
): Effect.Effect<A, DataFileError> {
  const decode = Schema.decodeUnknownSync(Schema.fromJsonString(schema));

  return Effect.tryPromise({
    try: async () => {
      try {
        return decode(await readFile(path.join(directory, file), "utf8"));
      } catch (error) {
        if (isMissingFile(error)) {
          return fallback;
        }

        throw error;
      }
    },
    catch: (cause) => new DataFileError({ file, operation: "read", cause }),
  });
}

export function writeJsonFile<A, I>(
  directory: string,
  file: string,
  schema: Schema.Codec<A, I>,
  value: A,
): Effect.Effect<void, DataFileError> {
  const encode = Schema.encodeSync(schema);

  return Effect.tryPromise({
    try: async () => {
      const target = path.join(directory, file);
      const temporary = `${target}.${process.pid}.tmp`;
      await mkdir(directory, { recursive: true });
      await writeFile(temporary, `${JSON.stringify(encode(value), null, 2)}\n`, "utf8");
      await rename(temporary, target);
    },
    catch: (cause) => new DataFileError({ file, operation: "write", cause }),
  });
}
