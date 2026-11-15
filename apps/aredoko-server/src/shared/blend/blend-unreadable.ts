import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class BlendUnreadable extends taggedError<BlendUnreadable, { readonly brand: unique symbol }>()(
  "BlendUnreadable",
  { path: Schema.String, cause: Schema.Defect() },
) {}

export { BlendUnreadable };
