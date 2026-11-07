import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class PreviewFailed extends taggedError<PreviewFailed, { readonly brand: unique symbol }>()(
  "PreviewFailed",
  { path: Schema.String, cause: Schema.Defect() },
) {}

export { PreviewFailed };
