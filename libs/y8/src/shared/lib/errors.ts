import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class Y8Error extends taggedError<Y8Error, { readonly brand: unique symbol }>()("Y8Error", {
  message: Schema.String,
}) {}

export const failedWith =
  (message: string) =>
  (cause: unknown): Y8Error =>
    Y8Error.make({ message: `${message}: ${String(cause)}` });
