import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ExtractFailed extends taggedError<ExtractFailed, { readonly brand: unique symbol }>()(
  "ExtractFailed",
  {
    message: Schema.String,
  },
) {}
