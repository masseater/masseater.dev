import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class I68Error extends taggedError<I68Error, { readonly brand: unique symbol }>()(
  "I68Error",
  { message: Schema.String },
) {}

export const failedWith =
  (message: string) =>
  (cause: unknown): I68Error =>
    I68Error.make({ message: `${message}: ${String(cause)}` });
