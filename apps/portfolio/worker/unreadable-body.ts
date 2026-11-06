import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class UnreadableBody extends taggedError<UnreadableBody, { readonly brand: unique symbol }>()(
  "UnreadableBody",
  { message: Schema.String },
) {}

export { UnreadableBody };
