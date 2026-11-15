import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class PortalFailed extends taggedError<PortalFailed, { readonly brand: unique symbol }>()(
  "PortalFailed",
  { errorTag: Schema.String, text: Schema.String },
) {}
