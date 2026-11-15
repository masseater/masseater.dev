import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class MemoryNotFound extends taggedError<
  MemoryNotFound,
  { readonly brand: unique symbol }
>()("MemoryNotFound", { project: Schema.String, memoryName: Schema.String }) {}
