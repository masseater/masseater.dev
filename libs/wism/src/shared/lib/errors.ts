import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class WismError extends taggedError<WismError, { readonly brand: unique symbol }>()(
  "WismError",
  {
    message: Schema.String,
  },
) {}

export const failedWith =
  (message: string) =>
  (cause: unknown): WismError =>
    WismError.make({ message: `${message}: ${String(cause)}` });
