import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class MemoryExists extends taggedError<MemoryExists, { readonly brand: unique symbol }>()(
  "MemoryExists",
  { project: Schema.String, memoryName: Schema.String },
) {}

export { MemoryExists };
