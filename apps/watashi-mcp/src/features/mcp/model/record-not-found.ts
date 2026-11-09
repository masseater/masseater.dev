import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class RecordNotFound extends taggedError<RecordNotFound, { readonly brand: unique symbol }>()(
  "RecordNotFound",
  { ref: Schema.String },
) {}

export { RecordNotFound };
