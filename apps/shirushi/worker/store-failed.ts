import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class StoreFailed extends taggedError<StoreFailed, { readonly brand: unique symbol }>()(
  "StoreFailed",
  { message: Schema.String },
) {}
