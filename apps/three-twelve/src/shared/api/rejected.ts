import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class Rejected extends taggedError<Rejected, { readonly brand: unique symbol }>()(
  "Rejected",
  {
    status: Schema.Finite,
    reason: Schema.String,
  },
) {}
