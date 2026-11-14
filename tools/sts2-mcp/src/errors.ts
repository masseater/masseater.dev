import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class Sts2Failed extends taggedError<Sts2Failed, { readonly brand: unique symbol }>()(
  "Sts2Failed",
  { message: Schema.String },
  { identifier: "Sts2Failed" },
) {}

export { Sts2Failed };
