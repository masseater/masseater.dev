import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class EmbeddingFailed extends taggedError<EmbeddingFailed, { readonly brand: unique symbol }>()(
  "EmbeddingFailed",
  { cause: Schema.Defect() },
) {}

export { EmbeddingFailed };
