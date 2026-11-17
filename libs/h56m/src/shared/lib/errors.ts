import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class H56mError extends taggedError<H56mError, { readonly brand: unique symbol }>()(
  "H56mError",
  { message: Schema.String },
) {}

export const failedWith =
  (message: string) =>
  (cause: unknown): H56mError =>
    H56mError.make({ message: `${message}: ${String(cause)}` });
