import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ImageError extends taggedError<ImageError, { readonly brand: unique symbol }>()(
  "ImageError",
  {
    reason: Schema.String,
  },
) {}
