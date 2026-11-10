import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class ImageError extends taggedError<ImageError, { readonly brand: unique symbol }>()(
  "ImageError",
  {
    reason: Schema.String,
  },
) {}

export { ImageError };
