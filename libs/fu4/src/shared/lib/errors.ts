import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class Fu4Error extends taggedError<Fu4Error, { readonly brand: unique symbol }>()(
  "Fu4Error",
  {
    message: Schema.String,
  },
) {}

export const failedWith =
  (message: string) =>
  (cause: unknown): Fu4Error =>
    Fu4Error.make({ message: `${message}: ${String(cause)}` });
