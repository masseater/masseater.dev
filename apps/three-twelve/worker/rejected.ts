import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class Rejected extends taggedError<Rejected, { readonly brand: unique symbol }>()("Rejected", {
  status: Schema.Finite,
  reason: Schema.String,
}) {}

export { Rejected };
