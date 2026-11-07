import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class ModelUnreadable extends taggedError<ModelUnreadable, { readonly brand: unique symbol }>()(
  "ModelUnreadable",
  { pathname: Schema.String, cause: Schema.Defect() },
) {}

export { ModelUnreadable };
