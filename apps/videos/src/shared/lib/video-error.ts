import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class VideoError extends taggedError<VideoError, { readonly brand: unique symbol }>()(
  "VideoError",
  {
    message: Schema.String,
  },
) {}

export const videoError = (message: string): VideoError => VideoError.make({ message });

export const failedWith = (cause: unknown): VideoError =>
  VideoError.make({ message: String(cause) });
