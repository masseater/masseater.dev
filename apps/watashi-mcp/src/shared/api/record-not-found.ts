import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class RecordNotFound extends taggedError<
  RecordNotFound,
  { readonly brand: unique symbol }
>()("RecordNotFound", { ref: Schema.String }) {}
