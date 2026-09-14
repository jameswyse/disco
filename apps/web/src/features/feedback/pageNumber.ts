import { Schema } from "effect";
export const decodePageNumber = Schema.decodeUnknownSync(
  Schema.Number.pipe(Schema.int(), Schema.positive()),
);
