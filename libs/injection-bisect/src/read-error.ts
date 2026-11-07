import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class ReadError extends taggedError<ReadError, { readonly brand: unique symbol }>()("ReadError", {
  reason: Schema.String,
}) {}

const readErrorOf = (cause: unknown): ReadError => ReadError.make({ reason: String(cause) });

export { ReadError, readErrorOf };
