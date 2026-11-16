import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class Sts2Failed extends taggedError<Sts2Failed, { readonly brand: unique symbol }>()(
  "Sts2Failed",
  { message: Schema.String },
  { identifier: "Sts2Failed" },
) {}
