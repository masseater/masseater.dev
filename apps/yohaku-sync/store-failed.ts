import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class StoreFailed extends taggedError<StoreFailed, { readonly brand: unique symbol }>()(
  "StoreFailed",
  { message: Schema.String },
) {}

export { StoreFailed };
