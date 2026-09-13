import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Config, Data, Effect, Schema } from "effect";

/** A JSON data file could not be read or written. */
export class DataFileError extends Data.TaggedError("DataFileError")<{
  readonly file: string;
  readonly operation: "read" | "write";
  readonly cause: unknown;
}> {}

/** Directory holding Disco's own data (saved views, preferences). Mount it as a volume in Docker. */
export const dataDirectoryConfig = Config.string("DISCO_DATA_DIR").pipe(Config.withDefault("data"));

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Read and validate a JSON file under the data directory, or return `fallback` when absent. */
export function readJsonFile<A, I>(
  directory: string,
  file: string,
  schema: Schema.Schema<A, I>,
  fallback: A,
): Effect.Effect<A, DataFileError> {
  const decode = Schema.decodeUnknownSync(Schema.parseJson(schema));

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

/** Atomically replace a JSON file under the data directory, creating the directory if needed. */
export function writeJsonFile<A, I>(
  directory: string,
  file: string,
  schema: Schema.Schema<A, I>,
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
