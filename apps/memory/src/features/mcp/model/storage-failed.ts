import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class StorageFailed extends taggedError<StorageFailed, { readonly brand: unique symbol }>()(
  "StorageFailed",
  { message: Schema.String },
) {}

export { StorageFailed };
