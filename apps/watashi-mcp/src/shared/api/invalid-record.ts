import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class InvalidRecord extends taggedError<InvalidRecord, { readonly brand: unique symbol }>()(
  "InvalidRecord",
  { message: Schema.String },
) {}
