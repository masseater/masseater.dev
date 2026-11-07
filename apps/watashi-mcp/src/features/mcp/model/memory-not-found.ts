import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class MemoryNotFound extends taggedError<MemoryNotFound, { readonly brand: unique symbol }>()(
  "MemoryNotFound",
  { project: Schema.String, memoryName: Schema.String },
) {}

export { MemoryNotFound };
