import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class Unplayable extends taggedError<Unplayable, { readonly brand: unique symbol }>()(
  "Unplayable",
  { part: Schema.String },
) {}
