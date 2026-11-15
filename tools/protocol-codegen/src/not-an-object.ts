import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class NotAnObject extends taggedError<NotAnObject, { readonly brand: unique symbol }>()(
  "NotAnObject",
  { root: Schema.String },
) {}
