import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class ModelError extends taggedError<ModelError, { readonly brand: unique symbol }>()(
  "ModelError",
  {
    reason: Schema.String,
  },
) {}

export { ModelError };
