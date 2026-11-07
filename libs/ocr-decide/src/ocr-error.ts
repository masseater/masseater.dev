import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class OcrError extends taggedError<OcrError, { readonly brand: unique symbol }>()("OcrError", {
  reason: Schema.String,
}) {}

export { OcrError };
