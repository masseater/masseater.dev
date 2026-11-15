import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class PortalFailed extends taggedError<PortalFailed, { readonly brand: unique symbol }>()(
  "PortalFailed",
  { errorTag: Schema.String, text: Schema.String },
) {}

export { PortalFailed };
