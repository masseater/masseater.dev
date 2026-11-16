import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ReadError extends taggedError<ReadError, { readonly brand: unique symbol }>()(
  "ReadError",
  {
    reason: Schema.String,
  },
) {}

export const readErrorOf = (cause: unknown): ReadError => ReadError.make({ reason: String(cause) });
