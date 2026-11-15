import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class EmbeddingFailed extends taggedError<
  EmbeddingFailed,
  { readonly brand: unique symbol }
>()("EmbeddingFailed", { cause: Schema.Defect() }) {}
