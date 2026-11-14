import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class NotAnObject extends taggedError<NotAnObject, { readonly brand: unique symbol }>()(
  "NotAnObject",
  { root: Schema.String },
) {}

export { NotAnObject };
